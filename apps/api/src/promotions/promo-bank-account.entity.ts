import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promo_bank_accounts')
export class PromoBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bank_name', length: 80 })
  bankName!: string;

  @Column({ name: 'account_name', length: 120 })
  accountName!: string;

  @Column({ name: 'account_number', length: 40 })
  accountNumber!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  branch!: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
