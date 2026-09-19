import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Dealer } from './dealer.entity';
import { User } from '../users/user.entity';
import { Listing } from '../listings/listing.entity';
import { InventoryDocument } from './inventory-document.entity';

@Entity('dealer_inventory_items')
@Index('IDX_dealer_inventory_dealer_id', ['dealerId'])
@Index('IDX_dealer_inventory_owner_user_id', ['ownerUserId'])
@Index('UQ_dealer_inventory_listing_id', ['listingId'], { unique: true })
export class DealerInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dealer_id', type: 'uuid' })
  dealerId!: string;

  @ManyToOne(() => Dealer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealer_id' })
  dealer!: Dealer;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  owner!: User;

  @Column({ length: 160 })
  title!: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 80, nullable: true })
  brandName!: string | null;

  @Column({ name: 'model_name', type: 'varchar', length: 80, nullable: true })
  modelName!: string | null;

  @Column({ name: 'manufacture_year', type: 'int', nullable: true })
  manufactureYear!: number | null;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate!: string | null;

  @Column({ name: 'cost_price_lkr', type: 'int', nullable: true })
  costPriceLkr!: number | null;

  @Column({ name: 'asking_price_lkr', type: 'int', nullable: true })
  askingPriceLkr!: number | null;

  @Column({ name: 'sold_price_lkr', type: 'int', nullable: true })
  soldPriceLkr!: number | null;

  @Column({ name: 'sold_at', type: 'timestamptz', nullable: true })
  soldAt!: Date | null;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId!: string | null;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing | null;

  @OneToMany(() => InventoryDocument, (doc) => doc.inventoryItem)
  documents!: InventoryDocument[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
