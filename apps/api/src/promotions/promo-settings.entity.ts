import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('promo_settings')
export class PromoSettings {
  @PrimaryColumn({ length: 20 })
  id!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
