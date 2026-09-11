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
import { ListingImage } from './listing-image.entity';
import { Listing } from './listing.entity';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_IMAGES = 5;

@Injectable()
export class ListingImagesService {
  constructor(
    @InjectRepository(ListingImage)
    private readonly images: Repository<ListingImage>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly storage: StorageService,
  ) {}

  async listForListing(listingId: string) {
    return this.images.find({
      where: { listingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async upload(owner: User, listingId: string, file?: Express.Multer.File) {
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

    const listing = await this.getOwnedListing(owner.id, listingId);
    const count = await this.images.count({ where: { listingId: listing.id } });
    if (count >= MAX_LISTING_IMAGES) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MAX_IMAGES',
          message: `Maximum ${MAX_LISTING_IMAGES} photos per listing`,
        },
      });
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `${listing.id}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );
    const image = this.images.create({
      listingId: listing.id,
      storageKey: stored.storageKey,
      imageUrl: stored.publicUrl,
      thumbnailUrl: stored.publicUrl,
      sortOrder: count,
      isCover: count === 0,
    });
    return this.images.save(image);
  }

  async remove(owner: User, listingId: string, imageId: string) {
    await this.getOwnedListing(owner.id, listingId);
    const image = await this.images.findOne({
      where: { id: imageId, listingId },
    });
    if (!image) {
      throw new NotFoundException({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found' },
      });
    }
    await this.storage.deleteObject(image.storageKey);
    await this.images.remove(image);
    await this.resequence(listingId);
    return { id: imageId };
  }

  /** First remaining photo (by order) becomes the cover. */
  private async resequence(listingId: string) {
    const remaining = await this.images.find({
      where: { listingId },
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

  private async getOwnedListing(sellerId: string, listingId: string) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your listing' },
      });
    }
    return listing;
  }
}
