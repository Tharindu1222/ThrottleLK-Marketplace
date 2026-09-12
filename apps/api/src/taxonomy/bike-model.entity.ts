import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from './brand.entity';
import { Category } from './category.entity';

@Entity('bike_models')
@Unique(['brandId', 'slug'])
@Index(['brandId', 'status'])
@Index(['brandId', 'name'])
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

  /** Unique per brand (see Unique brandId+slug). Not globally unique. */
  @Column({ length: 140 })
  slug!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  aliases!: string[];

  /** Seed taxonomy label e.g. "Street Bikes", "Commuter" */
  @Column({ name: 'default_category', type: 'varchar', length: 80, nullable: true })
  defaultCategory!: string | null;

  @Column({ name: 'default_engine_cc', type: 'int', nullable: true })
  defaultEngineCc!: number | null;

  /** Petrol | Electric | etc. */
  @Column({ name: 'fuel_type', type: 'varchar', length: 40, nullable: true })
  fuelType!: string | null;

  /** CURRENT | LEGACY | IMPORT_ONLY | REVIEW_REQUIRED */
  @Column({ name: 'model_status', type: 'varchar', length: 40, default: 'REVIEW_REQUIRED' })
  modelStatus!: string;

  @Column({ name: 'market_origins', type: 'jsonb', default: () => "'[]'" })
  marketOrigins!: string[];

  @Column({ name: 'is_current', type: 'boolean', nullable: true })
  isCurrent!: boolean | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  /** active | inactive */
  @Column({ default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
