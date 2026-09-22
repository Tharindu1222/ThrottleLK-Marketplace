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

@Entity('part_listing_images')
@Index('IDX_part_listing_images_listing_sort', ['partListingId', 'sortOrder'])
export class PartListingImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'part_listing_id' })
  partListingId!: string;

  @ManyToOne(() => PartListing, (listing) => listing.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing;

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
