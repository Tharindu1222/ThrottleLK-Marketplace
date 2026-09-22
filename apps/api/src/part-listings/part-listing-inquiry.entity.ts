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

@Entity('part_listing_inquiries')
@Index('IDX_part_listing_inquiries_listing_id', ['partListingId'])
export class PartListingInquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'part_listing_id' })
  partListingId!: string;

  @ManyToOne(() => PartListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing;

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
