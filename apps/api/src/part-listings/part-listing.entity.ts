import type { ListingStatus, PartListingKind } from '@throttlelk/types';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { District } from '../taxonomy/district.entity';
import { City } from '../taxonomy/city.entity';
import { PartCategory } from './part-category.entity';
import { PartListingImage } from './part-listing-image.entity';
import { PartListingFitment } from './part-listing-fitment.entity';

@Entity('part_listings')
@Index('IDX_part_listings_status_published_at', ['status', 'publishedAt'])
@Index('IDX_part_listings_status_kind', ['status', 'kind'])
@Index('IDX_part_listings_status_category_id', ['status', 'categoryId'])
@Index('IDX_part_listings_status_district_id', ['status', 'districtId'])
@Index('IDX_part_listings_status_price_lkr', ['status', 'priceLkr'])
@Index('IDX_part_listings_parts_dealer_id', ['partsDealerId'])
export class PartListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parts_dealer_id' })
  partsDealerId!: string;

  @ManyToOne(() => PartsDealer)
  @JoinColumn({ name: 'parts_dealer_id' })
  partsDealer!: PartsDealer;

  @Column({ length: 20 })
  kind!: PartListingKind;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => PartCategory)
  @JoinColumn({ name: 'category_id' })
  category!: PartCategory;

  @Column({ length: 160 })
  title!: string;

  @Column({ unique: true, length: 200 })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'price_lkr', type: 'int' })
  priceLkr!: number;

  @Column({ default: true })
  negotiable!: boolean;

  @Column({ length: 40 })
  condition!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp!: string | null;

  @Column({ name: 'district_id' })
  districtId!: string;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'district_id' })
  district!: District;

  @Column({ name: 'city_id' })
  cityId!: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city!: City;

  @Column({ length: 40, default: 'draft' })
  status!: ListingStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column({ name: 'phone_click_count', type: 'int', default: 0 })
  phoneClickCount!: number;

  @Column({ name: 'whatsapp_click_count', type: 'int', default: 0 })
  whatsappClickCount!: number;

  @Column({ name: 'sold_price_lkr', type: 'int', nullable: true })
  soldPriceLkr!: number | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'sold_at', type: 'timestamptz', nullable: true })
  soldAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => PartListingImage, (image) => image.partListing)
  images!: PartListingImage[];

  @OneToMany(() => PartListingFitment, (fitment) => fitment.partListing)
  fitments!: PartListingFitment[];
}
