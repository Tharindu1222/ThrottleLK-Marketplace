import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { Brand } from './brand.entity';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class BrandLogoService {
  constructor(
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    private readonly storage: StorageService,
  ) {}

  listActive() {
    return this.brands.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async uploadLogo(brandId: string, file?: Express.Multer.File) {
    const brand = await this.getBrandOrThrow(brandId);
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

    if (brand.logoStorageKey) {
      await this.storage
        .deleteObject(brand.logoStorageKey)
        .catch(() => undefined);
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `brands/${brandId}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    brand.logoStorageKey = stored.storageKey;
    brand.logoUrl = stored.publicUrl;
    return this.brands.save(brand);
  }

  async removeLogo(brandId: string) {
    const brand = await this.getBrandOrThrow(brandId);
    if (brand.logoStorageKey) {
      await this.storage
        .deleteObject(brand.logoStorageKey)
        .catch(() => undefined);
    }
    brand.logoStorageKey = null;
    brand.logoUrl = null;
    return this.brands.save(brand);
  }

  private async getBrandOrThrow(brandId: string) {
    const brand = await this.brands.findOne({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      });
    }
    return brand;
  }
}
