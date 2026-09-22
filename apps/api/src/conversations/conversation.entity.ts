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
import { Listing } from '../listings/listing.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { User } from '../users/user.entity';
import { ConversationMessage } from './conversation-message.entity';

@Entity('conversations')
@Index('UQ_conversations_listing_buyer', ['listingId', 'buyerUserId'], {
  unique: true,
  where: '"listing_id" IS NOT NULL',
})
@Index('UQ_conversations_part_listing_buyer', ['partListingId', 'buyerUserId'], {
  unique: true,
  where: '"part_listing_id" IS NOT NULL',
})
@Index('IDX_conversations_buyer_last_message', ['buyerUserId', 'lastMessageAt'])
@Index('IDX_conversations_seller_last_message', ['sellerUserId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId!: string | null;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing | null;

  @Column({ name: 'part_listing_id', type: 'uuid', nullable: true })
  partListingId!: string | null;

  @ManyToOne(() => PartListing, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'part_listing_id' })
  partListing!: PartListing | null;

  @Column({ name: 'buyer_user_id' })
  buyerUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_user_id' })
  buyer!: User;

  @Column({ name: 'seller_user_id' })
  sellerUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_user_id' })
  seller!: User;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ name: 'buyer_last_read_at', type: 'timestamptz', nullable: true })
  buyerLastReadAt!: Date | null;

  @Column({ name: 'seller_last_read_at', type: 'timestamptz', nullable: true })
  sellerLastReadAt!: Date | null;

  @OneToMany(() => ConversationMessage, (m) => m.conversation)
  messages!: ConversationMessage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
