import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('listing_post_settings')
export class ListingPostSettings {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'private_free_listings', type: 'int', default: 5 })
  privateFreeListings!: number;

  @Column({ name: 'dealer_free_listings', type: 'int', default: 10 })
  dealerFreeListings!: number;

  @Column({ name: 'parts_free_listings', type: 'int', default: 10 })
  partsFreeListings!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
