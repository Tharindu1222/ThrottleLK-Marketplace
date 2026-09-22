import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { PartListing } from './part-listing.entity';

@Entity('part_favourites')
@Unique(['userId', 'partListingId'])
@Index('IDX_part_favourites_listing_id', ['partListingId'])
export class PartFavourite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'part_listing_id' })
  partListingId!: string;

  @ManyToOne(() => PartListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
