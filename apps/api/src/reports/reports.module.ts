import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { ListingImage } from '../listings/listing-image.entity';
import { ListingsModule } from '../listings/listings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartListingImage } from '../part-listings/part-listing-image.entity';
import { PartListingsModule } from '../part-listings/part-listings.module';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      Listing,
      ListingImage,
      PartListing,
      PartListingImage,
    ]),
    ListingsModule,
    forwardRef(() => PartListingsModule),
    NotificationsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
