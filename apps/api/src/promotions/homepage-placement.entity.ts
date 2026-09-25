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
import { PromoRequest } from './promo-request.entity';
import type { PromoSubjectType } from './promo-package.entity';

export type PlacementSource = 'request' | 'admin_override';

@Entity('homepage_placements')
@Index('IDX_homepage_placements_ends_at', ['endsAt'])
@Index('IDX_homepage_placements_listing', ['listingId'])
@Index('IDX_homepage_placements_part', ['partListingId'])
export class HomepagePlacement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  @ManyToOne(() => PromoRequest, { nullable: true })
  @JoinColumn({ name: 'request_id' })
  request!: PromoRequest | null;

  @Column({ length: 20 })
  source!: PlacementSource;

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

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
