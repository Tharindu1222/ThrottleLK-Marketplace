import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PackageAudience } from './listing-post-rules';

@Entity('listing_packages')
export class ListingPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  audience!: PackageAudience;

  @Column({ length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'price_lkr', type: 'int' })
  priceLkr!: number;

  @Column({ name: 'listing_count', type: 'int' })
  listingCount!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
