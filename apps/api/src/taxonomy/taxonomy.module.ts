import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BikeModel } from './bike-model.entity';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { City } from './city.entity';
import { District } from './district.entity';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, BikeModel, Category, District, City]),
  ],
  providers: [TaxonomyService],
  controllers: [TaxonomyController],
  exports: [TaxonomyService, TypeOrmModule],
})
export class TaxonomyModule {}
