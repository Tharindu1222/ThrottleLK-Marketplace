import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartFavourite } from '../part-listings/part-favourite.entity';
import { PartListingEngagementEvent } from '../part-listings/part-listing-engagement-event.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { PartsDealerImage } from './parts-dealer-image.entity';
import { PartsDealerImagesService } from './parts-dealer-images.service';
import { PartsDealer } from './parts-dealer.entity';
import { PartsDealersController } from './parts-dealers.controller';
import { PartsDealersService } from './parts-dealers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartsDealer,
      PartsDealerImage,
      PartListing,
      PartListingEngagementEvent,
      PartFavourite,
    ]),
    UsersModule,
    NotificationsModule,
    StorageModule,
  ],
  providers: [PartsDealersService, PartsDealerImagesService],
  controllers: [PartsDealersController],
  exports: [PartsDealersService, PartsDealerImagesService, TypeOrmModule],
})
export class PartsDealersModule {}
