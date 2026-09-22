import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartListing } from './part-listing.entity';

export type PartEngagementType = 'view' | 'phone' | 'whatsapp';

@Entity('part_listing_engagement_events')
@Index('IDX_part_listing_engagement_listing_type_created', [
  'partListingId',
  'type',
  'createdAt',
])
@Index('IDX_part_listing_engagement_created', ['createdAt'])
export class PartListingEngagementEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'part_listing_id', type: 'uuid' })
  partListingId!: string;

  @ManyToOne(() => PartListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing;

  @Column({ type: 'varchar', length: 20 })
  type!: PartEngagementType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
