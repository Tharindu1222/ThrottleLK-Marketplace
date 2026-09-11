import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { Dealer } from './dealer.entity';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer]),
    UsersModule,
    NotificationsModule,
  ],
  providers: [DealersService],
  controllers: [DealersController],
  exports: [DealersService, TypeOrmModule],
})
export class DealersModule {}
