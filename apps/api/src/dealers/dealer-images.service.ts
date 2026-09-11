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
import { DealerImage } from './dealer-image.entity';
import { Dealer } from './dealer.entity';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_DEALER_IMAGES = 5;

@Injectable()
export class DealerImagesService {
  constructor(
    @InjectRepository(DealerImage)
    private readonly images: Repository<DealerImage>,
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    private readonly storage: StorageService,
  ) {}

  async listForDealer(dealerId: string) {
    return this.images.find({
      where: { dealerId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async uploadForOwner(owner: User, dealerId: string, file?: Express.Multer.File) {
    await this.assertOwnedDealer(owner.id, dealerId);
    return this.upload(dealerId, file);
  }

  async uploadAsAdmin(dealerId: string, file?: Express.Multer.File) {
    await this.getDealerOrThrow(dealerId);
    return this.upload(dealerId, file);
  }

  async removeForOwner(owner: User, dealerId: string, imageId: string) {
    await this.assertOwnedDealer(owner.id, dealerId);
    return this.remove(dealerId, imageId);
  }

  async removeAsAdmin(dealerId: string, imageId: string) {
    await this.getDealerOrThrow(dealerId);
    return this.remove(dealerId, imageId);
  }

  private async upload(dealerId: string, file?: Express.Multer.File) {
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

    const count = await this.images.count({ where: { dealerId } });
    if (count >= MAX_DEALER_IMAGES) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MAX_IMAGES',
          message: `Maximum ${MAX_DEALER_IMAGES} photos per dealer shop`,
        },
      });
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `dealers/${dealerId}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );
    const image = this.images.create({
      dealerId,
      storageKey: stored.storageKey,
      imageUrl: stored.publicUrl,
      thumbnailUrl: stored.publicUrl,
      sortOrder: count,
      isCover: count === 0,
    });
    return this.images.save(image);
  }

  private async remove(dealerId: string, imageId: string) {
    const image = await this.images.findOne({
      where: { id: imageId, dealerId },
    });
    if (!image) {
      throw new NotFoundException({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found' },
      });
    }
    await this.storage.deleteObject(image.storageKey);
    await this.images.remove(image);
    await this.resequence(dealerId);
    return { id: imageId };
  }

  private async resequence(dealerId: string) {
    const remaining = await this.images.find({
      where: { dealerId },
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

  private async getDealerOrThrow(dealerId: string) {
    const dealer = await this.dealers.findOne({ where: { id: dealerId } });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
    return dealer;
  }

  private async assertOwnedDealer(ownerUserId: string, dealerId: string) {
    const dealer = await this.getDealerOrThrow(dealerId);
    if (dealer.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your dealer profile' },
      });
    }
    return dealer;
  }
}
