import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { ListingsModule } from '../listings/listings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartListingsModule } from '../part-listings/part-listings.module';
import { StorageModule } from '../storage/storage.module';
import { AdminPromotionsController } from './admin-promotions.controller';
import { HomeController } from './home.controller';
import { HomepagePlacement } from './homepage-placement.entity';
import { PromoBankAccount } from './promo-bank-account.entity';
import { PromoPackage } from './promo-package.entity';
import { PromoRequest } from './promo-request.entity';
import { PromoSettings } from './promo-settings.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromoPackage,
      PromoBankAccount,
      PromoSettings,
      PromoRequest,
      HomepagePlacement,
      Listing,
      PartListing,
    ]),
    ListingsModule,
    PartListingsModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [
    PromotionsController,
    AdminPromotionsController,
    HomeController,
  ],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
