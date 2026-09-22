import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { PartsDealerImage } from './parts-dealer-image.entity';
import { PartsDealer } from './parts-dealer.entity';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PARTS_DEALER_IMAGES = 1;

@Injectable()
export class PartsDealerImagesService {
  constructor(
    @InjectRepository(PartsDealerImage)
    private readonly images: Repository<PartsDealerImage>,
    @InjectRepository(PartsDealer)
    private readonly partsDealers: Repository<PartsDealer>,
    private readonly storage: StorageService,
  ) {}

  async listForPartsDealer(partsDealerId: string) {
    return this.images.find({
      where: { partsDealerId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async uploadForOwner(
    owner: User,
    partsDealerId: string,
    file?: Express.Multer.File,
  ) {
    await this.assertOwned(owner.id, partsDealerId);
    return this.upload(partsDealerId, file);
  }

  async uploadAsAdmin(partsDealerId: string, file?: Express.Multer.File) {
    await this.getOrThrow(partsDealerId);
    return this.upload(partsDealerId, file);
  }

  async removeForOwner(owner: User, partsDealerId: string, imageId: string) {
    await this.assertOwned(owner.id, partsDealerId);
    return this.remove(partsDealerId, imageId);
  }

  async removeAsAdmin(partsDealerId: string, imageId: string) {
    await this.getOrThrow(partsDealerId);
    return this.remove(partsDealerId, imageId);
  }

  private async upload(partsDealerId: string, file?: Express.Multer.File) {
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

    const count = await this.images.count({ where: { partsDealerId } });
    if (count >= MAX_PARTS_DEALER_IMAGES) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MAX_IMAGES',
          message: `Maximum ${MAX_PARTS_DEALER_IMAGES} photo per parts shop`,
        },
      });
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `parts-dealers/${partsDealerId}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );
    const image = this.images.create({
      partsDealerId,
      storageKey: stored.storageKey,
      imageUrl: stored.publicUrl,
      thumbnailUrl: stored.publicUrl,
      sortOrder: count,
      isCover: count === 0,
    });
    return this.images.save(image);
  }

  private async remove(partsDealerId: string, imageId: string) {
    const image = await this.images.findOne({
      where: { id: imageId, partsDealerId },
    });
    if (!image) {
      throw new NotFoundException({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found' },
      });
    }
    await this.storage.deleteObject(image.storageKey);
    await this.images.remove(image);
    await this.resequence(partsDealerId);
    return { id: imageId };
  }

  private async resequence(partsDealerId: string) {
    const remaining = await this.images.find({
      where: { partsDealerId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i]!.sortOrder = i;
      remaining[i]!.isCover = i === 0;
    }
    if (remaining.length > 0) {
      await this.images.save(remaining);
    }
  }

  private async getOrThrow(partsDealerId: string) {
    const dealer = await this.partsDealers.findOne({
      where: { id: partsDealerId },
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_FOUND',
          message: 'Parts dealer not found',
        },
      });
    }
    return dealer;
  }

  private async assertOwned(ownerUserId: string, partsDealerId: string) {
    const dealer = await this.getOrThrow(partsDealerId);
    if (dealer.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your parts dealer profile' },
      });
    }
    return dealer;
  }
}
