import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { DealerImage } from './dealer-image.entity';
import { DealerImagesService } from './dealer-images.service';
import { Dealer } from './dealer.entity';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer, DealerImage, Listing]),
    UsersModule,
    NotificationsModule,
    StorageModule,
  ],
  providers: [DealersService, DealerImagesService],
  controllers: [DealersController],
  exports: [DealersService, DealerImagesService, TypeOrmModule],
})
export class DealersModule {}
