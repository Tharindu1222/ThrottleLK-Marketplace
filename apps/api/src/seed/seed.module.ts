import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { Brand } from '../taxonomy/brand.entity';
import { Category } from '../taxonomy/category.entity';
import { City } from '../taxonomy/city.entity';
import { District } from '../taxonomy/district.entity';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    UsersModule,
    TaxonomyModule,
    TypeOrmModule.forFeature([
      Listing,
      Brand,
      BikeModel,
      Category,
      District,
      City,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
