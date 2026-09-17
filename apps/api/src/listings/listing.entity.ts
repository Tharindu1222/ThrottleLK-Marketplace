import type { ListingStatus } from '@throttlelk/types';
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
import { User } from '../users/user.entity';
import { Brand } from '../taxonomy/brand.entity';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { Category } from '../taxonomy/category.entity';
import { District } from '../taxonomy/district.entity';
import { City } from '../taxonomy/city.entity';
import { Dealer } from '../dealers/dealer.entity';
import { ListingImage } from './listing-image.entity';

@Entity('listings')
@Index('IDX_listings_status_published_at', ['status', 'publishedAt'])
@Index('IDX_listings_status_brand_id', ['status', 'brandId'])
@Index('IDX_listings_status_district_id', ['status', 'districtId'])
@Index('IDX_listings_status_category_id', ['status', 'categoryId'])
@Index('IDX_listings_status_price_lkr', ['status', 'priceLkr'])
@Index('IDX_listings_seller_updated_at', ['sellerId', 'updatedAt'])
@Index('IDX_listings_dealer_id', ['dealerId'])
@Index('IDX_listings_model_id', ['modelId'])
@Index('IDX_listings_city_id', ['cityId'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ name: 'dealer_id', type: 'uuid', nullable: true })
  dealerId!: string | null;

  @ManyToOne(() => Dealer, { nullable: true })
  @JoinColumn({ name: 'dealer_id' })
  dealer!: Dealer | null;

  @Column({ name: 'brand_id' })
  brandId!: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand;

  @Column({ name: 'model_id' })
  modelId!: string;

  @ManyToOne(() => BikeModel)
  @JoinColumn({ name: 'model_id' })
  model!: BikeModel;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

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

  @Column({ name: 'manufacture_year', type: 'int' })
  manufactureYear!: number;

  @Column({ name: 'registration_year', type: 'int', nullable: true })
  registrationYear!: number | null;

  @Column({ name: 'engine_cc', type: 'int', nullable: true })
  engineCc!: number | null;

  @Column({ type: 'int', nullable: true })
  mileage!: number | null;

  @Column({ name: 'fuel_type', length: 40 })
  fuelType!: string;

  @Column({ length: 40 })
  transmission!: string;

  @Column({ length: 40 })
  condition!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  colour!: string | null;

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

  @OneToMany(() => ListingImage, (image) => image.listing)
  images!: ListingImage[];
}
