import { CacheService } from '../common/cache.service';
import { isPublicPart } from '../common/public-listing';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { assertSafeImageFile } from '../common/image-bytes';
import {
  deletePublicMarketplaceImage,
  storePublicMarketplaceImage,
} from '../common/image-variants';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { PartListingImage } from './part-listing-image.entity';
import { PartListing } from './part-listing.entity';

const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PART_LISTING_IMAGES = 5;

@Injectable()
export class PartListingImagesService {
  constructor(
    @InjectRepository(PartListingImage)
    private readonly images: Repository<PartListingImage>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    @InjectRepository(PartsDealer)
    private readonly partsDealers: Repository<PartsDealer>,
    private readonly storage: StorageService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  async listForListing(partListingId: string, viewer?: User | null) {
    await this.assertCanView(partListingId, viewer);
    return this.images.find({
      where: { partListingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async upload(owner: User, partListingId: string, file?: Express.Multer.File) {
    await this.getOwnedListing(owner.id, partListingId);
    const result = await this.uploadFile(partListingId, file);
    await this.reviewOwnerChanges(partListingId);
    return result;
  }

  async uploadAsAdmin(partListingId: string, file?: Express.Multer.File) {
    await this.getListingOrThrow(partListingId);
    return this.uploadFile(partListingId, file);
  }

  async remove(owner: User, partListingId: string, imageId: string) {
    await this.getOwnedListing(owner.id, partListingId);
    const result = await this.removeImage(partListingId, imageId);
    await this.reviewOwnerChanges(partListingId);
    return result;
  }

  async removeAsAdmin(partListingId: string, imageId: string) {
    await this.getListingOrThrow(partListingId);
    return this.removeImage(partListingId, imageId);
  }

  private async reviewOwnerChanges(partListingId: string) {
    await this.partListings.update(
      { id: partListingId, status: In(['active', 'paused', 'expired']) },
      { status: 'pending_review', publishedAt: null, rejectionReason: null },
    );
    await this.cache?.invalidatePublicListings();
  }

  private async uploadFile(partListingId: string, file?: Express.Multer.File) {
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

    const count = await this.images.count({ where: { partListingId } });
    if (count >= MAX_PART_LISTING_IMAGES) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MAX_IMAGES',
          message: `Maximum ${MAX_PART_LISTING_IMAGES} photos per listing`,
        },
      });
    }

    const stored = await storePublicMarketplaceImage(
      this.storage,
      `part-listings/${partListingId}/${randomUUID()}`,
      file.buffer,
      'photo',
    );
    const image = this.images.create({
      partListingId,
      storageKey: stored.storageKey,
      imageUrl: stored.imageUrl,
      thumbnailUrl: stored.thumbnailUrl,
      sortOrder: count,
      isCover: count === 0,
    });
    return this.images.save(image);
  }

  private async removeImage(partListingId: string, imageId: string) {
    const image = await this.images.findOne({
      where: { id: imageId, partListingId },
    });
    if (!image) {
      throw new NotFoundException({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found' },
      });
    }
    await deletePublicMarketplaceImage(this.storage, image.storageKey);
    await this.images.remove(image);
    await this.resequence(partListingId);
    return { id: imageId };
  }

  private async resequence(partListingId: string) {
    const remaining = await this.images.find({
      where: { partListingId },
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

  private async getListingOrThrow(partListingId: string) {
    const listing = await this.partListings.findOne({
      where: { id: partListingId },
      relations: ['partsDealer', 'partsDealer.owner'],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    return listing;
  }

  private async getOwnedListing(ownerUserId: string, partListingId: string) {
    const listing = await this.getListingOrThrow(partListingId);
    const dealer = await this.partsDealers.findOne({
      where: { id: listing.partsDealerId },
    });
    if (!dealer || dealer.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your listing' },
      });
    }
    if (listing.status === 'sold') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Sold listings cannot have their photos changed',
        },
      });
    }
    return listing;
  }

  private async assertCanView(partListingId: string, viewer?: User | null) {
    const listing = await this.getListingOrThrow(partListingId);
    const dealer = await this.partsDealers.findOne({
      where: { id: listing.partsDealerId },
    });
    const isOwner = Boolean(dealer && viewer?.id === dealer.ownerUserId);
    const isAdmin = Boolean(
      viewer?.roles?.some((role) => role.name === 'admin'),
    );
    if (!isPublicPart(listing) && !isOwner && !isAdmin) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
  }
}
