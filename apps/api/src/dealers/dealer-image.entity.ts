import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dealer } from './dealer.entity';

@Entity('dealer_images')
export class DealerImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dealer_id' })
  dealerId!: string;

  @ManyToOne(() => Dealer, (dealer) => dealer.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dealer_id' })
  dealer!: Dealer;

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
