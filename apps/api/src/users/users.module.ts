import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { StorageModule } from '../storage/storage.module';
import { Dealer } from '../dealers/dealer.entity';
import { Role } from './role.entity';
import { SellersController } from './sellers.controller';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Listing, Dealer]), StorageModule],
  providers: [UsersService],
  controllers: [UsersController, SellersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
