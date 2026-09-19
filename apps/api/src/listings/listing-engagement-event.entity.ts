import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Listing } from './listing.entity';

export type EngagementType = 'view' | 'phone' | 'whatsapp';

@Entity('listing_engagement_events')
@Index('IDX_listing_engagement_listing_type_created', [
  'listingId',
  'type',
  'createdAt',
])
@Index('IDX_listing_engagement_created', ['createdAt'])
export class ListingEngagementEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ type: 'varchar', length: 20 })
  type!: EngagementType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
