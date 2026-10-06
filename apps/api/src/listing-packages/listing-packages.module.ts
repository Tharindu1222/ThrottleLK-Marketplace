import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin/admin-audit.module';
import { Dealer } from '../dealers/dealer.entity';
import { Listing } from '../listings/listing.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { PayHereModule } from '../promotions/payhere.module';
import { AdminListingPackagesController } from './admin-listing-packages.controller';
import { ListingPackage } from './listing-package.entity';
import { ListingPackagesController } from './listing-packages.controller';
import { ListingPackagesService } from './listing-packages.service';
import { ListingPostOrder, ListingQuota } from './listing-post-order.entity';
import { ListingPostSettings } from './listing-post-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingPostSettings,
      ListingPackage,
      ListingPostOrder,
      ListingQuota,
      Dealer,
      PartsDealer,
      Listing,
      PartListing,
    ]),
    PayHereModule,
    AdminAuditModule,
  ],
  controllers: [ListingPackagesController, AdminListingPackagesController],
  providers: [ListingPackagesService],
  exports: [ListingPackagesService],
})
export class ListingPackagesModule {}
