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

@Entity('listing_inquiries')
@Index('IDX_listing_inquiries_listing_id', ['listingId'])
export class ListingInquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'buyer_name', length: 120 })
  buyerName!: string;

  @Column({ name: 'buyer_phone', length: 20 })
  buyerPhone!: string;

  @Column({ name: 'buyer_email', type: 'varchar', nullable: true })
  buyerEmail!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
