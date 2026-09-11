import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersModule } from '../dealers/dealers.module';
import { Dealer } from '../dealers/dealer.entity';
import { Listing } from '../listings/listing.entity';
import { ListingsModule } from '../listings/listings.module';
import { Report } from '../reports/report.entity';
import { ReportsModule } from '../reports/reports.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    ListingsModule,
    DealersModule,
    ReportsModule,
    TaxonomyModule,
    UsersModule,
    TypeOrmModule.forFeature([Listing, Dealer, Report]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
