import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { Favourite } from './favourite.entity';

function toBrowseCard(listing: Listing) {
  const images = [...(listing.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const cover = images[0] ?? null;
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    priceLkr: listing.priceLkr,
    manufactureYear: listing.manufactureYear,
    engineCc: listing.engineCc,
    mileage: listing.mileage,
    condition: listing.condition,
    brandName: listing.brand?.name ?? null,
    modelName: listing.model?.name ?? null,
    districtName: listing.district?.name ?? null,
    cityName: listing.city?.name ?? null,
    sellerType: listing.dealerId ? 'dealer' : 'private',
    coverImageUrl: cover?.imageUrl ?? null,
    listedAt: (listing.publishedAt ?? listing.createdAt)?.toISOString() ?? null,
    viewCount: listing.viewCount ?? 0,
  };
}

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favourite)
    private readonly favourites: Repository<Favourite>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
  ) {}

  async listForUser(userId: string) {
    const rows = await this.favourites.find({
      where: { userId },
      relations: [
        'listing',
        'listing.brand',
        'listing.model',
        'listing.district',
        'listing.city',
        'listing.images',
      ],
      order: { createdAt: 'DESC' },
    });
    return rows
      .filter((row) => row.listing && row.listing.status === 'active')
      .map((row) => ({
        id: row.id,
        listingId: row.listingId,
        createdAt: row.createdAt,
        listing: toBrowseCard(row.listing),
      }));
  }

  async idsForUser(userId: string): Promise<string[]> {
    const rows = await this.favourites.find({
      where: { userId },
      select: ['listingId'],
    });
    return rows.map((r) => r.listingId);
  }

  async userIdsForListing(listingId: string): Promise<string[]> {
    const rows = await this.favourites.find({
      where: { listingId },
      select: ['userId'],
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async add(userId: string, listingId: string) {
    const listing = await this.listings.findOne({
      where: { id: listingId, status: 'active' },
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    const existing = await this.favourites.findOne({
      where: { userId, listingId },
    });
    if (existing) {
      throw new ConflictException({
        success: false,
        error: { code: 'ALREADY_FAVOURITED', message: 'Already in favourites' },
      });
    }
    const fav = await this.favourites.save(
      this.favourites.create({ userId, listingId }),
    );
    return { id: fav.id, listingId: fav.listingId, createdAt: fav.createdAt };
  }

  async remove(userId: string, listingId: string) {
    const existing = await this.favourites.findOne({
      where: { userId, listingId },
    });
    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'FAVOURITE_NOT_FOUND', message: 'Favourite not found' },
      });
    }
    await this.favourites.remove(existing);
    return { listingId };
  }
}
