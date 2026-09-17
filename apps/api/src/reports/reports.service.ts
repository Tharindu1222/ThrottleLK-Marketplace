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
import { Report } from './report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
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
      .where('r.status = :status', { status: 'open' })
      .orderBy('r.createdAt', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(r.reason) LIKE :q OR LOWER(r.description) LIKE :q OR LOWER(r.listingId) LIKE :q)',
        { q },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows, meta: paginationMeta(total, page, limit) };
  }

  async setStatus(id: string, status: 'actioned' | 'dismissed') {
    const report = await this.reports.findOne({ where: { id } });
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
    report.status = status;
    const saved = await this.reports.save(report);
    void this.cache.invalidateDashboard();
    return saved;
  }
}
