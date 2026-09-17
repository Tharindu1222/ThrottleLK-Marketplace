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

@Entity('listing_images')
@Index('IDX_listing_images_listing_sort', ['listingId', 'sortOrder'])
export class ListingImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => Listing, (listing) => listing.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'storage_key' })
  storageKey!: string;

  @Column({ name: 'image_url' })
  imageUrl!: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_cover', default: false })
  isCover!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
