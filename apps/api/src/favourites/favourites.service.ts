import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { Listing } from '../listings/listing.entity';
import { ListingImage } from '../listings/listing-image.entity';
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
    @InjectRepository(ListingImage)
    private readonly listingImages: Repository<ListingImage>,
  ) {}

  async listForUser(
    userId: string,
    paging?: { page?: string | number; limit?: string | number },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.favourites
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.listing', 'listing')
      .leftJoinAndSelect('listing.brand', 'brand')
      .leftJoinAndSelect('listing.model', 'model')
      .leftJoinAndSelect('listing.district', 'district')
      .leftJoinAndSelect('listing.city', 'city')
      .where('f.userId = :userId', { userId })
      .andWhere('listing.status = :status', { status: 'active' })
      .orderBy('f.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrls(rows.map((row) => row.listingId));
    return {
      items: rows.map((row) => ({
        id: row.id,
        listingId: row.listingId,
        createdAt: row.createdAt,
        listing: {
          ...toBrowseCard(row.listing),
          coverImageUrl: covers.get(row.listingId) ?? null,
        },
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  private async coverUrls(ids: string[]) {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const images = await this.listingImages
      .createQueryBuilder('img')
      .select(['img.listingId', 'img.imageUrl', 'img.sortOrder', 'img.isCover'])
      .where('img.listingId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    for (const img of images) {
      if (!map.has(img.listingId)) map.set(img.listingId, img.imageUrl);
    }
    return map;
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
