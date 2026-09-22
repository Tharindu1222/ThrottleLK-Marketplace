import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { PartsDealersService } from '../parts-dealers/parts-dealers.service';
import { PartFavourite } from './part-favourite.entity';
import { PartListingImage } from './part-listing-image.entity';
import { PartListing } from './part-listing.entity';

function toBrowseCard(
  listing: PartListing,
  coverImageUrl: string | null,
  dealerVerified: boolean,
) {
  return {
    id: listing.id,
    slug: listing.slug,
    kind: listing.kind,
    title: listing.title,
    priceLkr: listing.priceLkr,
    condition: listing.condition,
    categoryName: listing.category?.name ?? null,
    districtName: listing.district?.name ?? null,
    cityName: listing.city?.name ?? null,
    partsDealerId: listing.partsDealerId,
    dealerVerified,
    coverImageUrl,
    listedAt: (listing.publishedAt ?? listing.createdAt)?.toISOString() ?? null,
    viewCount: listing.viewCount ?? 0,
  };
}

@Injectable()
export class PartFavouritesService {
  constructor(
    @InjectRepository(PartFavourite)
    private readonly favourites: Repository<PartFavourite>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    @InjectRepository(PartListingImage)
    private readonly listingImages: Repository<PartListingImage>,
    private readonly partsDealersService: PartsDealersService,
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
      .innerJoinAndSelect('f.partListing', 'listing')
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.district', 'district')
      .leftJoinAndSelect('listing.city', 'city')
      .where('f.userId = :userId', { userId })
      .andWhere('listing.status = :status', { status: 'active' })
      .orderBy('f.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrls(rows.map((row) => row.partListingId));
    const verifiedIds = await this.partsDealersService.activeVerifiedIds(
      rows.map((row) => row.partListing.partsDealerId),
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        partListingId: row.partListingId,
        createdAt: row.createdAt,
        listing: toBrowseCard(
          row.partListing,
          covers.get(row.partListingId) ?? null,
          verifiedIds.has(row.partListing.partsDealerId),
        ),
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  private async coverUrls(ids: string[]) {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const images = await this.listingImages
      .createQueryBuilder('img')
      .select([
        'img.partListingId',
        'img.imageUrl',
        'img.sortOrder',
        'img.isCover',
      ])
      .where('img.partListingId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    for (const img of images) {
      if (!map.has(img.partListingId)) map.set(img.partListingId, img.imageUrl);
    }
    return map;
  }

  async idsForUser(userId: string): Promise<string[]> {
    const rows = await this.favourites.find({
      where: { userId },
      select: ['partListingId'],
    });
    return rows.map((r) => r.partListingId);
  }

  async countsByListingIds(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;
    const rows = await this.favourites
      .createQueryBuilder('f')
      .select('f.part_listing_id', 'partListingId')
      .addSelect('COUNT(*)', 'count')
      .where('f.part_listing_id IN (:...ids)', { ids })
      .groupBy('f.part_listing_id')
      .getRawMany<{ partListingId: string; count: string }>();
    for (const row of rows) {
      map.set(row.partListingId, Number(row.count));
    }
    return map;
  }

  async add(userId: string, partListingId: string) {
    const listing = await this.partListings.findOne({
      where: { id: partListingId, status: 'active' },
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
    const existing = await this.favourites.findOne({
      where: { userId, partListingId },
    });
    if (existing) {
      throw new ConflictException({
        success: false,
        error: { code: 'ALREADY_FAVOURITED', message: 'Already in favourites' },
      });
    }
    const fav = await this.favourites.save(
      this.favourites.create({ userId, partListingId }),
    );
    return {
      id: fav.id,
      partListingId: fav.partListingId,
      createdAt: fav.createdAt,
    };
  }

  async remove(userId: string, partListingId: string) {
    const existing = await this.favourites.findOne({
      where: { userId, partListingId },
    });
    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'FAVOURITE_NOT_FOUND', message: 'Favourite not found' },
      });
    }
    await this.favourites.remove(existing);
    return { partListingId };
  }
}
