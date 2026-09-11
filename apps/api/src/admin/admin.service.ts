import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from '../dealers/dealer.entity';
import { Listing } from '../listings/listing.entity';
import { Report } from '../reports/report.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly users: UsersService,
  ) {}

  async dashboard() {
    const [
      users,
      activeListings,
      pendingListings,
      pendingDealers,
      openReports,
    ] = await Promise.all([
      this.users.countUsers(),
      this.listings.count({ where: { status: 'active' } }),
      this.listings.count({ where: { status: 'pending_review' } }),
      this.dealers.count({ where: { status: 'pending' } }),
      this.reports.count({ where: { status: 'open' } }),
    ]);
    return {
      users,
      activeListings,
      pendingListings,
      pendingDealers,
      openReports,
    };
  }
}
