import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favourite } from '../favourites/favourite.entity';
import { ListingEngagementEvent } from '../listings/listing-engagement-event.entity';
import { Listing } from '../listings/listing.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { DealerImage } from './dealer-image.entity';
import { DealerImagesService } from './dealer-images.service';
import { DealerInventoryItem } from './dealer-inventory-item.entity';
import { Dealer } from './dealer.entity';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { InventoryDocument } from './inventory-document.entity';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dealer,
      DealerImage,
      DealerInventoryItem,
      InventoryDocument,
      Listing,
      ListingEngagementEvent,
      Favourite,
    ]),
    UsersModule,
    NotificationsModule,
    StorageModule,
  ],
  providers: [DealersService, DealerImagesService, InventoryService],
  controllers: [DealersController],
  exports: [
    DealersService,
    DealerImagesService,
    InventoryService,
    TypeOrmModule,
  ],
})
export class DealersModule {}
