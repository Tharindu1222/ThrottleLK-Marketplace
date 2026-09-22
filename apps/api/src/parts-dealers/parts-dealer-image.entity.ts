import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartsDealer } from './parts-dealer.entity';

@Entity('parts_dealer_images')
export class PartsDealerImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parts_dealer_id' })
  partsDealerId!: string;

  @ManyToOne(() => PartsDealer, (dealer) => dealer.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parts_dealer_id' })
  partsDealer!: PartsDealer;

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
