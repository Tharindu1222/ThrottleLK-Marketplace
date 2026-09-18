import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateReportInput } from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { Listing } from '../listings/listing.entity';
import { ListingImage } from '../listings/listing-image.entity';
import { ListingsService } from '../listings/listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Report } from './report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(ListingImage)
    private readonly listingImages: Repository<ListingImage>,
    private readonly listingsService: ListingsService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  async create(userId: string | null, input: CreateReportInput) {
    const listing = await this.listings.findOne({
      where: { id: input.listingId },
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    const report = this.reports.create({
      listingId: input.listingId,
      reportedByUserId: userId,
      reason: input.reason,
      description: input.description,
      status: 'open',
    });
    const saved = await this.reports.save(report);
    void this.cache.invalidateDashboard();
    return saved;
  }

  async listOpen(paging?: {
    page?: string | number;
    limit?: string | number;
    q?: string;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.reports
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.listing', 'listing')
      .where('r.status = :status', { status: 'open' })
      .orderBy('r.createdAt', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(r.reason) LIKE :q OR LOWER(r.description) LIKE :q OR LOWER(r.listingId) LIKE :q OR LOWER(listing.title) LIKE :q)',
        { q },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    const listingIds = rows
      .map((row) => row.listingId)
      .filter(Boolean);
    const coverByListing = new Map<string, string>();
    if (listingIds.length > 0) {
      const images = await this.listingImages
        .createQueryBuilder('img')
        .select(['img.listingId', 'img.imageUrl', 'img.sortOrder', 'img.isCover'])
        .where('img.listingId IN (:...ids)', { ids: listingIds })
        .orderBy('img.isCover', 'DESC')
        .addOrderBy('img.sortOrder', 'ASC')
        .getMany();
      for (const img of images) {
        if (!coverByListing.has(img.listingId)) {
          coverByListing.set(img.listingId, img.imageUrl);
        }
      }
    }

    return {
      items: rows.map((row) =>
        this.toAdminReport(row, coverByListing.get(row.listingId) ?? null),
      ),
      meta: paginationMeta(total, page, limit),
    };
  }

  async resolve(
    id: string,
    action: 'remove_listing' | 'dismiss' | 'warn_seller',
    note?: string,
  ) {
    const report = await this.reports.findOne({
      where: { id },
      relations: ['listing'],
    });
    if (!report) {
      throw new NotFoundException({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' },
      });
    }
    if (report.status !== 'open') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'REPORT_NOT_OPEN',
          message: 'Report is not open',
        },
      });
    }

    if (action === 'remove_listing') {
      const reason = (
        note ?? `Report (${report.reason}): ${report.description}`
      ).slice(0, 1000);
      await this.listingsService.takeDownForModeration(report.listingId, reason);
      report.status = 'actioned';
    } else if (action === 'warn_seller') {
      const listing = report.listing;
      if (!listing) {
        throw new NotFoundException({
          success: false,
          error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        });
      }
      const message = (
        note ??
        `Your listing was reported for ${report.reason}. ${report.description}`
      ).slice(0, 1000);
      await this.notifications.listingWarning(
        listing.sellerId,
        {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
        },
        message,
      );
      report.status = 'actioned';
    } else {
      report.status = 'dismissed';
    }

    const saved = await this.reports.save(report);
    void this.cache.invalidateDashboard();
    return saved;
  }

  private toAdminReport(report: Report, coverImageUrl: string | null) {
    const listing = report.listing;
    return {
      id: report.id,
      listingId: report.listingId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            slug: listing.slug,
            coverImageUrl,
            status: listing.status,
          }
        : null,
    };
  }
}
