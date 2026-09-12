import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersModule } from '../dealers/dealers.module';
import { FavouritesModule } from '../favourites/favourites.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { ListingImage } from './listing-image.entity';
import { ListingImagesService } from './listing-images.service';
import { ListingInquiry } from './listing-inquiry.entity';
import { Listing } from './listing.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, ListingInquiry, ListingImage]),
    forwardRef(() => DealersModule),
    NotificationsModule,
    FavouritesModule,
    StorageModule,
    UsersModule,
  ],
  providers: [ListingsService, ListingImagesService],
  controllers: [ListingsController],
  exports: [ListingsService, ListingImagesService, TypeOrmModule],
})
export class ListingsModule {}
