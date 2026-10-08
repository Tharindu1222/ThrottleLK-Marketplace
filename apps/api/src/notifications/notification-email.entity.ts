import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notification_emails')
@Index('IDX_notification_emails_due', ['status', 'availableAt'])
export class NotificationEmail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_notification_emails_notification', { unique: true })
  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ length: 64 })
  type!: string;

  @Column({ name: 'recipient', type: 'text' })
  recipient!: string;

  @Column({ name: 'sender', type: 'text' })
  sender!: string;

  @Column({ type: 'text', nullable: true })
  subject!: string | null;

  @Column({ type: 'text', nullable: true })
  html!: string | null;

  @Column({ default: 'pending', length: 16 })
  status!: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

  @Column({ default: 0 })
  attempts!: number;

  @Column({ name: 'available_at', type: 'timestamptz', default: () => 'NOW()' })
  availableAt!: Date;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: 'lease_token', type: 'uuid', nullable: true })
  leaseToken!: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
