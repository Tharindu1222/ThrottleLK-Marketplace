import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { Dealer } from '../dealers/dealer.entity';
import { ListingPostOrder } from '../listing-packages/listing-post-order.entity';
import { Listing } from '../listings/listing.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { PromoRequest } from '../promotions/promo-request.entity';
import { Report } from '../reports/report.entity';
import { UsersService } from '../users/users.service';

type DashboardSummary = {
  users: number;
  activeListings: number;
  pendingListings: number;
  soldListings: number;
  activePartListings: number;
  pendingPartListings: number;
  soldPartListings: number;
  activeDealers: number;
  pendingDealers: number;
  activePartsDealers: number;
  pendingPartsDealers: number;
  pendingPromoRequests: number;
  openReports: number;
  listingPackagePending: number;
  listingPackageFailed: number;
  listingPackageChargebacks: number;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    @InjectRepository(PartsDealer)
    private readonly partsDealers: Repository<PartsDealer>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(PromoRequest)
    private readonly promoRequests: Repository<PromoRequest>,
    @InjectRepository(ListingPostOrder)
    private readonly listingOrders: Repository<ListingPostOrder>,
    private readonly users: UsersService,
    private readonly cache: CacheService,
  ) {}

  async dashboard() {
    const cached = await this.cache.get<DashboardSummary>(this.cache.keys.dashboard);
    if (
      cached?.soldListings != null &&
      cached.activePartListings != null &&
      cached.listingPackagePending != null
    ) {
      return cached;
    }
    const [
      users,
      activeListings,
      pendingListings,
      soldListings,
      activePartListings,
      pendingPartListings,
      soldPartListings,
      activeDealers,
      pendingDealers,
      activePartsDealers,
      pendingPartsDealers,
      pendingPromoRequests,
      openReports,
      listingPackagePending,
      listingPackageFailed,
      listingPackageChargebacks,
    ] = await Promise.all([
      this.users.countUsers(),
      this.listings.count({ where: { status: 'active' } }),
      this.listings.count({ where: { status: 'pending_review' } }),
      this.listings.count({ where: { status: 'sold' } }),
      this.partListings.count({ where: { status: 'active' } }),
      this.partListings.count({ where: { status: 'pending_review' } }),
      this.partListings.count({ where: { status: 'sold' } }),
      this.dealers.count({ where: { status: 'active' } }),
      this.dealers.count({ where: { status: 'pending' } }),
      this.partsDealers.count({ where: { status: 'active' } }),
      this.partsDealers.count({ where: { status: 'pending' } }),
      this.promoRequests.count({
        where: { status: 'pending', paymentStatus: 'paid' },
      }),
      this.reports.count({ where: { status: 'open' } }),
      this.listingOrders.count({ where: { status: 'pending' } }),
      this.listingOrders.count({ where: { status: 'failed' } }),
      this.listingOrders.count({ where: { status: 'chargedback' } }),
    ]);
    const data: DashboardSummary = {
      users,
      activeListings,
      pendingListings,
      soldListings,
      activePartListings,
      pendingPartListings,
      soldPartListings,
      activeDealers,
      pendingDealers,
      activePartsDealers,
      pendingPartsDealers,
      pendingPromoRequests,
      openReports,
      listingPackagePending,
      listingPackageFailed,
      listingPackageChargebacks,
    };
    await this.cache.set(this.cache.keys.dashboard, data, 60);
    return data;
  }
}
