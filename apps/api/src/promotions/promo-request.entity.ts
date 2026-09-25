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

@Entity('promo_requests')
@Index('IDX_promo_requests_status_created', ['status', 'createdAt'])
@Index('IDX_promo_requests_listing_status', ['listingId', 'status'])
@Index('IDX_promo_requests_part_status', ['partListingId', 'status'])
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

  @ManyToOne(() => PromoPackage)
  @JoinColumn({ name: 'package_id' })
  package!: PromoPackage;

  @Column({ name: 'bank_account_id' })
  bankAccountId!: string;

  @ManyToOne(() => PromoBankAccount)
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: PromoBankAccount;

  @Column({ name: 'slip_storage_key', length: 400 })
  slipStorageKey!: string;

  @Column({ name: 'slip_content_type', length: 80 })
  slipContentType!: string;

  @Column({ name: 'slip_original_name', length: 200 })
  slipOriginalName!: string;

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
