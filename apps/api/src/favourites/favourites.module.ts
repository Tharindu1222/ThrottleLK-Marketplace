import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersModule } from '../dealers/dealers.module';
import { Listing } from '../listings/listing.entity';
import { ListingImage } from '../listings/listing-image.entity';
import { Favourite } from './favourite.entity';
import { FavouritesController } from './favourites.controller';
import { FavouritesService } from './favourites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favourite, Listing, ListingImage]),
    DealersModule,
  ],
  controllers: [FavouritesController],
  providers: [FavouritesService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
