import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('admin_audit_logs')
@Index('IDX_admin_audit_logs_created_at', ['createdAt'])
@Index('IDX_admin_audit_logs_actor', ['actorUserId'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  /** Name at the time of the action, so a later rename does not rewrite history. */
  @Column({ name: 'actor_name', type: 'varchar', length: 160, nullable: true })
  actorName!: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail!: string | null;

  @Column({ length: 80 })
  action!: string;

  @Column({ name: 'entity_type', length: 40 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 80, nullable: true })
  entityId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
