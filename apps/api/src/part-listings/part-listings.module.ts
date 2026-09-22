import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { PartsDealersModule } from '../parts-dealers/parts-dealers.module';
import { StorageModule } from '../storage/storage.module';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { Brand } from '../taxonomy/brand.entity';
import { UsersModule } from '../users/users.module';
import { ModifiedPartsController } from './modified-parts.controller';
import { PartCategoriesController } from './part-categories.controller';
import { PartCategoriesService } from './part-categories.service';
import { PartCategory } from './part-category.entity';
import { PartFavourite } from './part-favourite.entity';
import { PartFavouritesController } from './part-favourites.controller';
import { PartFavouritesService } from './part-favourites.service';
import { PartListingEngagementEvent } from './part-listing-engagement-event.entity';
import { PartListingFitment } from './part-listing-fitment.entity';
import { PartListingImage } from './part-listing-image.entity';
import { PartListingImagesService } from './part-listing-images.service';
import { PartListingInquiry } from './part-listing-inquiry.entity';
import { PartListing } from './part-listing.entity';
import { PartListingsController } from './part-listings.controller';
import { PartListingsService } from './part-listings.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartListing,
      PartListingImage,
      PartListingFitment,
      PartCategory,
      PartFavourite,
      PartListingInquiry,
      PartListingEngagementEvent,
      Listing,
      Brand,
      BikeModel,
      PartsDealer,
    ]),
    forwardRef(() => PartsDealersModule),
    NotificationsModule,
    StorageModule,
    UsersModule,
  ],
  controllers: [
    PartListingsController,
    SparePartsController,
    ModifiedPartsController,
    PartFavouritesController,
    PartCategoriesController,
  ],
  providers: [
    PartListingsService,
    PartListingImagesService,
    PartCategoriesService,
    PartFavouritesService,
  ],
  exports: [
    PartListingsService,
    PartListingImagesService,
    PartCategoriesService,
    PartFavouritesService,
    TypeOrmModule,
  ],
})
export class PartListingsModule {}
