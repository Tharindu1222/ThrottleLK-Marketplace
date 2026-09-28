import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { assertSafeImageFile } from '../common/image-bytes';
import {
  deletePublicMarketplaceImage,
  storePublicMarketplaceImage,
} from '../common/image-variants';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { ListingImage } from './listing-image.entity';
import { Listing } from './listing.entity';
import { isPubliclyListed } from './listing-expiry';

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

  async listForListing(listingId: string, viewer?: User | null) {
    await this.assertCanView(listingId, viewer);
    return this.images.find({
      where: { listingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async upload(owner: User, listingId: string, file?: Express.Multer.File) {
    await this.getOwnedListing(owner.id, listingId);
    return this.uploadFile(listingId, file);
  }

  async uploadAsAdmin(listingId: string, file?: Express.Multer.File) {
    await this.getListingOrThrow(listingId);
    return this.uploadFile(listingId, file);
  }

  async remove(owner: User, listingId: string, imageId: string) {
    await this.getOwnedListing(owner.id, listingId);
    return this.removeImage(listingId, imageId);
  }

  async removeAsAdmin(listingId: string, imageId: string) {
    await this.getListingOrThrow(listingId);
    return this.removeImage(listingId, imageId);
  }

  private async uploadFile(listingId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Image file is required' },
      });
    }
    assertSafeImageFile(file);
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Max image size is 5MB' },
      });
    }

    const count = await this.images.count({ where: { listingId } });
    if (count >= MAX_LISTING_IMAGES) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MAX_IMAGES',
          message: `Maximum ${MAX_LISTING_IMAGES} photos per listing`,
        },
      });
    }

    const stored = await storePublicMarketplaceImage(
      this.storage,
      `${listingId}/${randomUUID()}`,
      file.buffer,
      'photo',
    );
    const image = this.images.create({
      listingId,
      storageKey: stored.storageKey,
      imageUrl: stored.imageUrl,
      thumbnailUrl: stored.thumbnailUrl,
      sortOrder: count,
      isCover: count === 0,
    });
    const saved = await this.images.save(image);
    const listing = await this.getListingOrThrow(listingId);
    if (listing.status === 'active' || listing.status === 'sold') {
      listing.status = 'pending_review';
      listing.publishedAt = null;
      await this.listings.save(listing);
    }
    return saved;
  }

  private async removeImage(listingId: string, imageId: string) {
    const image = await this.images.findOne({
      where: { id: imageId, listingId },
    });
    if (!image) {
      throw new NotFoundException({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found' },
      });
    }
    await deletePublicMarketplaceImage(this.storage, image.storageKey);
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

  private async getListingOrThrow(listingId: string) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    return listing;
  }

  private async getOwnedListing(sellerId: string, listingId: string) {
    const listing = await this.getListingOrThrow(listingId);
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your listing' },
      });
    }
    return listing;
  }

  private async assertCanView(listingId: string, viewer?: User | null) {
    const listing = await this.getListingOrThrow(listingId);
    const isOwner = viewer?.id === listing.sellerId;
    const isAdmin = Boolean(viewer?.roles?.some((role) => role.name === 'admin'));
    if (!isPubliclyListed(listing.status, listing.expiresAt) && !isOwner && !isAdmin) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
  }
}
