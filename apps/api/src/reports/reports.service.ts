import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateReportInput } from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { Report } from './report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
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
    return this.reports.save(report);
  }

  listOpen() {
    return this.reports.find({
      where: { status: 'open' },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }
}
