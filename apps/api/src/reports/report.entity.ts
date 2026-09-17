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
import { User } from '../users/user.entity';

@Entity('reports')
@Index('IDX_reports_status_created_at', ['status', 'createdAt'])
@Index('IDX_reports_listing_id', ['listingId'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'reported_by_user_id', type: 'uuid', nullable: true })
  reportedByUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedBy!: User | null;

  @Column({ length: 40 })
  reason!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 40, default: 'open' })
  status!: 'open' | 'reviewed' | 'dismissed' | 'actioned';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
