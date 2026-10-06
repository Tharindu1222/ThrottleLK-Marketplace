import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { User } from '../users/user.entity';
import { AdminAuditService } from './admin-audit.service';
import { describeAdminMutation } from './describe-admin-audit';

type AuditRequest = {
  method?: string;
  route?: { path?: string };
  originalUrl?: string;
  url?: string;
  params?: Record<string, string | undefined>;
  body?: unknown;
  user?: User;
};

/**
 * Writes one audit row after a successful admin mutation.
 * The domain change is already committed; a logging failure is recorded and does not fail the request.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  constructor(private readonly audit: AdminAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<AuditRequest>();
    const method = req.method ?? 'GET';
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next.handle();
    }

    return next.handle().pipe(
      concatMap((response) => from(this.record(req, method, response))),
    );
  }

  private async record(req: AuditRequest, method: string, response: unknown) {
    const actor = req.user;
    if (!actor?.id) return response;

    const described = describeAdminMutation({
      method,
      routePath: req.route?.path || req.originalUrl || req.url || '',
      params: req.params,
      body: req.body,
      response,
    });
    if (!described) return response;

    try {
      await this.audit.record(
        actor,
        described.action,
        described.entityType,
        described.entityId,
        described.note,
      );
    } catch (err) {
      this.logger.error(
        `Failed to write admin audit log for ${described.action}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
    return response;
  }
}
