import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { BikeModel } from './bike-model.entity';
import { Brand } from './brand.entity';
import { BrandLogoService } from './brand-logo.service';
import { Category } from './category.entity';
import { CategoryCoverService } from './category-cover.service';
import { City } from './city.entity';
import { District } from './district.entity';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, BikeModel, Category, District, City]),
    StorageModule,
  ],
  providers: [TaxonomyService, CategoryCoverService, BrandLogoService],
  controllers: [TaxonomyController],
  exports: [
    TaxonomyService,
    CategoryCoverService,
    BrandLogoService,
    TypeOrmModule,
  ],
})
export class TaxonomyModule {}
