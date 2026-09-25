import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PromoSubjectType = 'bike' | 'part';

@Entity('promo_packages')
export class PromoPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 10 })
  kind!: PromoSubjectType;

  @Column({ length: 80 })
  name!: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ name: 'price_lkr', type: 'int' })
  priceLkr!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
