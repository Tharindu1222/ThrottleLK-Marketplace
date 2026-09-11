import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { Favourite } from './favourite.entity';

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
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
    return rows
      .filter((row) => row.listing && row.listing.status === 'active')
      .map((row) => ({
        id: row.id,
        listingId: row.listingId,
        createdAt: row.createdAt,
        listing: row.listing,
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
