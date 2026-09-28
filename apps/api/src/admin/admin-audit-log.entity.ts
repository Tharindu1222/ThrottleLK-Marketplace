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

  @Column({ name: 'actor_user_id' })
  actorUserId!: string;

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
