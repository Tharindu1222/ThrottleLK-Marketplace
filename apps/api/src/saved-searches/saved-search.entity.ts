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
import { User } from '../users/user.entity';

export type SavedSearchQuery = {
  q?: string;
  brandId?: string;
  modelId?: string;
  districtId?: string;
  minPrice?: number;
  maxPrice?: number;
};

@Entity('saved_searches')
@Index('IDX_saved_searches_user_id', ['userId'])
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: 'query_json', type: 'jsonb' })
  query!: SavedSearchQuery;

  @Column({ name: 'notifications_enabled', default: false })
  notificationsEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
