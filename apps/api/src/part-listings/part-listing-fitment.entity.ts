import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Brand } from '../taxonomy/brand.entity';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { PartListing } from './part-listing.entity';

@Entity('part_listing_fitments')
@Unique(['partListingId', 'brandId', 'modelId'])
@Index('IDX_part_listing_fitments_brand_model', ['brandId', 'modelId'])
@Index('IDX_part_listing_fitments_listing_id', ['partListingId'])
export class PartListingFitment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'part_listing_id' })
  partListingId!: string;

  @ManyToOne(() => PartListing, (listing) => listing.fitments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing;

  @Column({ name: 'brand_id' })
  brandId!: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand;

  /** Null means fits all models of the brand. */
  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  modelId!: string | null;

  @ManyToOne(() => BikeModel, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model!: BikeModel | null;
}
