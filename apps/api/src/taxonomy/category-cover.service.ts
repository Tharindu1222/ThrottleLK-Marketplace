import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { PUBLIC_CATEGORY_SLUGS } from './category-map';
import { Category } from './category.entity';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class CategoryCoverService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly storage: StorageService,
  ) {}

  listPublic() {
    return this.categories
      .createQueryBuilder('category')
      .where('category.slug IN (:...slugs)', { slugs: PUBLIC_CATEGORY_SLUGS })
      .getMany()
      .then((rows) => {
        const order = new Map<string, number>(
          PUBLIC_CATEGORY_SLUGS.map((slug, i) => [slug, i]),
        );
        return rows.sort(
          (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
        );
      });
  }

  async uploadCover(categoryId: string, file?: Express.Multer.File) {
    const category = await this.getPublicCategoryOrThrow(categoryId);
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Image file is required' },
      });
    }
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Only JPEG, PNG, or WebP images are allowed',
        },
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Max image size is 5MB' },
      });
    }

    if (category.coverStorageKey) {
      await this.storage.deleteObject(category.coverStorageKey).catch(() => undefined);
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `categories/${categoryId}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    category.coverStorageKey = stored.storageKey;
    category.coverImageUrl = stored.publicUrl;
    return this.categories.save(category);
  }

  async removeCover(categoryId: string) {
    const category = await this.getPublicCategoryOrThrow(categoryId);
    if (category.coverStorageKey) {
      await this.storage.deleteObject(category.coverStorageKey).catch(() => undefined);
    }
    category.coverStorageKey = null;
    category.coverImageUrl = null;
    return this.categories.save(category);
  }

  private async getPublicCategoryOrThrow(categoryId: string) {
    const category = await this.categories.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
      });
    }
    if (!(PUBLIC_CATEGORY_SLUGS as readonly string[]).includes(category.slug)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NOT_PUBLIC_CATEGORY',
          message: 'Cover images are only for public homepage categories',
        },
      });
    }
    return category;
  }
}
