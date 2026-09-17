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
import { User } from '../users/user.entity';
import { ConversationMessage } from './conversation-message.entity';

@Entity('conversations')
@Index(['listingId', 'buyerUserId'], { unique: true })
@Index('IDX_conversations_buyer_last_message', ['buyerUserId', 'lastMessageAt'])
@Index('IDX_conversations_seller_last_message', ['sellerUserId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

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
