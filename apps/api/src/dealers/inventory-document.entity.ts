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
import { DealerInventoryItem } from './dealer-inventory-item.entity';

export type InventoryDocumentType =
  | 'insurance'
  | 'revenue_license'
  | 'ownership_cr';

@Entity('inventory_documents')
@Unique(['inventoryItemId', 'type'])
@Index('IDX_inventory_documents_item_id', ['inventoryItemId'])
export class InventoryDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'inventory_item_id', type: 'uuid' })
  inventoryItemId!: string;

  @ManyToOne(() => DealerInventoryItem, (item) => item.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem!: DealerInventoryItem;

  @Column({ type: 'varchar', length: 40 })
  type!: InventoryDocumentType;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 300 })
  storageKey!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 200 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
