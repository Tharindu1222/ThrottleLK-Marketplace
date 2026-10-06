import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { User } from '../users/user.entity';
import { AdminAuditLog } from './admin-audit-log.entity';

export type AdminAuditListItem = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  note: string | null;
  area: string;
  createdAt: Date;
};

/** Admin sections the audit log can be filtered by. */
export const AUDIT_AREAS: Record<string, readonly string[]> = {
  listings: ['listing', 'dealer'],
  parts: ['part_listing', 'parts_dealer', 'part_category'],
  taxonomy: ['brand', 'model', 'district', 'city', 'category'],
  promotions: ['promo_request', 'promo_placement'],
  monetize: ['promo_package', 'promo_bank_account', 'promo_settings', 'listing_package'],
  users: ['user'],
  reports: ['report'],
};

export function auditAreaFor(entityType: string) {
  for (const [area, types] of Object.entries(AUDIT_AREAS)) {
    if (types.includes(entityType)) return area;
  }
  if (entityType === 'report') return 'reports';
  return 'other';
}

export function actorSnapshot(actor: Pick<User, 'firstName' | 'lastName' | 'email'>) {
  const name = [actor.firstName, actor.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return {
    actorName: (name || actor.email || 'Admin').slice(0, 160),
    actorEmail: actor.email?.slice(0, 255) ?? null,
  };
}

export function presentAuditLog(
  row: AdminAuditLog,
  fallback?: Pick<User, 'firstName' | 'lastName' | 'email'> | null,
): AdminAuditListItem {
  const live = fallback ? actorSnapshot(fallback) : null;
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorName || live?.actorName || null,
    actorEmail: row.actorEmail || live?.actorEmail || null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    note: row.note,
    area: auditAreaFor(row.entityType),
    createdAt: row.createdAt,
  };
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly logs: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  record(
    actor: User,
    action: string,
    entityType: string,
    entityId?: string | null,
    note?: string | null,
  ) {
    const snapshot = actorSnapshot(actor);
    return this.logs.save(
      this.logs.create({
        actorUserId: actor.id,
        actorName: snapshot.actorName,
        actorEmail: snapshot.actorEmail,
        action,
        entityType,
        entityId: entityId ?? null,
        note: note ?? null,
      }),
    );
  }

  async list(paging?: {
    page?: string | number;
    limit?: string | number;
    q?: string;
    area?: string;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 30,
      maxLimit: 100,
    });
    const qb = this.logs.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');
    const areaTypes = AUDIT_AREAS[paging?.area?.trim().toLowerCase() ?? ''];
    if (areaTypes) {
      qb.andWhere('log.entityType IN (:...areaTypes)', { areaTypes: [...areaTypes] });
    }
    const term = paging?.q?.trim().toLowerCase();
    if (term) {
      qb.andWhere(
        `(
          LOWER(log.action) LIKE :q
          OR LOWER(log.entityType) LIKE :q
          OR LOWER(COALESCE(log.entityId, '')) LIKE :q
          OR LOWER(COALESCE(log.note, '')) LIKE :q
          OR LOWER(COALESCE(log.actorName, '')) LIKE :q
          OR LOWER(COALESCE(log.actorEmail, '')) LIKE :q
          OR log.actorUserId IN (
            SELECT u.id FROM users u
            WHERE LOWER(u.email) LIKE :q
              OR LOWER(u.first_name) LIKE :q
              OR LOWER(u.last_name) LIKE :q
              OR LOWER(u.first_name || ' ' || u.last_name) LIKE :q
          )
        )`,
        { q: `%${term}%` },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const missingIds = [
      ...new Set(rows.filter((row) => !row.actorName).map((row) => row.actorUserId)),
    ];
    const fallback = new Map<string, User>();
    if (missingIds.length) {
      const found = await this.users
        .createQueryBuilder('user')
        .select(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
        .where('user.id IN (:...ids)', { ids: missingIds })
        .getMany();
      for (const user of found) fallback.set(user.id, user);
    }
    return {
      items: rows.map((row) => presentAuditLog(row, fallback.get(row.actorUserId))),
      meta: paginationMeta(total, page, limit),
    };
  }

  /** Drops audit history older than 90 days so the table stays bounded. */
  async purgeOlderThan(now = new Date()) {
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.logs
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }
}
