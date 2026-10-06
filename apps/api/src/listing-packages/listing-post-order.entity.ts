import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PackageAudience } from './listing-post-rules';

export type ListingPostOrderStatus = 'pending' | 'paid' | 'failed' | 'chargedback';

@Entity('listing_post_orders')
export class ListingPostOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @Column({ length: 20 })
  audience!: PackageAudience;

  @Column({ name: 'package_id' })
  packageId!: string;

  @Column({ length: 20, default: 'pending' })
  status!: ListingPostOrderStatus;

  @Column({ name: 'payhere_order_id', unique: true, length: 80 })
  payhereOrderId!: string;

  @Column({ name: 'payhere_payment_id', type: 'varchar', length: 80, nullable: true })
  payherePaymentId!: string | null;

  @Column({ name: 'charged_price_lkr', type: 'int' })
  chargedPriceLkr!: number;

  @Column({ name: 'listing_count', type: 'int' })
  listingCount!: number;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('listing_quotas')
@Index('UQ_listing_quotas_user_audience', ['userId', 'audience'], { unique: true })
export class ListingQuota {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ length: 20 })
  audience!: 'private' | 'dealer' | 'parts';

  @Column({ type: 'int', default: 0 })
  purchased!: number;

  @Column({ type: 'int', default: 0 })
  used!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
