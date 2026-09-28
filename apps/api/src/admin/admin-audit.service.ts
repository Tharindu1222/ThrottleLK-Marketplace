import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { User } from '../users/user.entity';
import { AdminAuditLog } from './admin-audit-log.entity';

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly logs: Repository<AdminAuditLog>,
  ) {}

  record(
    actor: User,
    action: string,
    entityType: string,
    entityId?: string | null,
    note?: string | null,
  ) {
    return this.logs.save(
      this.logs.create({
        actorUserId: actor.id,
        action,
        entityType,
        entityId: entityId ?? null,
        note: note ?? null,
      }),
    );
  }

  async list(paging?: { page?: string | number; limit?: string | number }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 30,
      maxLimit: 100,
    });
    const [rows, total] = await this.logs.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items: rows, meta: paginationMeta(total, page, limit) };
  }
}
