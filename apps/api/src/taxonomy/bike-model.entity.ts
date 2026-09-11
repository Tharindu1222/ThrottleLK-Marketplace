import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from './brand.entity';
import { Category } from './category.entity';

@Entity('bike_models')
export class BikeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'brand_id' })
  brandId!: string;

  @ManyToOne(() => Brand, (brand) => brand.models, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 140 })
  slug!: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
