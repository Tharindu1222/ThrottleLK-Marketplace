import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { User } from '../users/user.entity';
import { PromoBankAccount } from './promo-bank-account.entity';
import { PromoPackage } from './promo-package.entity';
import type { PromoSubjectType } from './promo-package.entity';

export type PromoRequestStatus = 'pending' | 'approved' | 'rejected';
export type PromoPaymentProvider = 'payhere' | 'bank';
export type PromoPaymentStatus = 'unpaid' | 'paid' | 'failed' | 'chargedback';

@Entity('promo_requests')
@Index('IDX_promo_requests_status_created', ['status', 'createdAt'])
@Index('IDX_promo_requests_listing_status', ['listingId', 'status'])
@Index('IDX_promo_requests_part_status', ['partListingId', 'status'])
@Index('IDX_promo_requests_payment_status_status_paid_at', [
  'paymentStatus',
  'status',
  'paidAt',
])
@Index('IDX_promo_requests_seller_id', ['sellerId'])
export class PromoRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ name: 'subject_type', length: 10 })
  subjectType!: PromoSubjectType;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId!: string | null;

  @ManyToOne(() => Listing, { nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing | null;

  @Column({ name: 'part_listing_id', type: 'uuid', nullable: true })
  partListingId!: string | null;

  @ManyToOne(() => PartListing, { nullable: true })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing | null;

  @Column({ name: 'package_id' })
  packageId!: string;

  /** Price locked when the seller started checkout. Package edits do not rewrite it. */
  @Column({ name: 'charged_price_lkr', type: 'int', nullable: true })
  chargedPriceLkr!: number | null;

  @Column({ name: 'package_snapshot', type: 'jsonb', nullable: true })
  packageSnapshot!: {
    name: string;
    durationDays: number;
    tier: import('./promo-package.entity').PromoTier;
    surfaces: import('./promo-package.entity').PromoSurface[];
    priority: number;
    currency: string;
  } | null;

  @ManyToOne(() => PromoPackage)
  @JoinColumn({ name: 'package_id' })
  package!: PromoPackage;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId!: string | null;

  @ManyToOne(() => PromoBankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: PromoBankAccount | null;

  @Column({
    name: 'slip_storage_key',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  slipStorageKey!: string | null;

  @Column({
    name: 'slip_content_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  slipContentType!: string | null;

  @Column({
    name: 'slip_original_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  slipOriginalName!: string | null;

  @Column({
    name: 'payment_provider',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  paymentProvider!: PromoPaymentProvider | null;

  @Column({
    name: 'payhere_order_id',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  payhereOrderId!: string | null;

  @Column({ name: 'payment_status', length: 20, default: 'unpaid' })
  paymentStatus!: PromoPaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({
    name: 'payhere_payment_id',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  payherePaymentId!: string | null;

  @Column({ length: 20, default: 'pending' })
  status!: PromoRequestStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy!: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
