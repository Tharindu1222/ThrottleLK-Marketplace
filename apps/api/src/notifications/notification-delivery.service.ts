import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { NotificationEmail } from './notification-email.entity';
import { notificationChannels } from './notification-policy';

const MAX_ATTEMPTS = 8;

@Injectable()
export class NotificationDeliveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @InjectRepository(NotificationEmail)
    private readonly deliveries: Repository<NotificationEmail>,
    private readonly users: UsersService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('NOTIFICATION_DELIVERY_ENABLED') === 'false')
      return;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, 5_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      // Stop ambiguous retries before the provider's 24-hour idempotency window ends.
      await this.deliveries.query(
        `UPDATE notification_emails SET status = 'failed', locked_until = NULL, lease_token = NULL
        WHERE status IN ('pending','sending') AND (attempts >= $1 OR created_at < NOW() - INTERVAL '23 hours')
          AND (locked_until IS NULL OR locked_until <= NOW())`,
        [MAX_ATTEMPTS],
      );
      for (let i = 0; i < 10; i++) {
        const token = randomUUID();
        const rows = (await this.deliveries.query(
          `WITH claimed AS (UPDATE notification_emails SET
          status = 'sending', attempts = attempts + 1, locked_until = NOW() + INTERVAL '60 seconds', lease_token = $1
          WHERE id = (SELECT id FROM notification_emails
            WHERE (status = 'pending' AND available_at <= NOW()) OR (status = 'sending' AND locked_until <= NOW())
            ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 1)
          RETURNING id, notification_id, user_id, type, recipient, sender, subject, html, attempts)
          SELECT * FROM claimed`,
          [token],
        )) as Array<{
          id: string;
          notification_id: string;
          user_id: string;
          type: string;
          recipient: string;
          sender: string;
          subject: string;
          html: string;
          attempts: number;
        }>;
        const job = rows[0];
        if (!job) break;
        try {
          const user = await this.users.findByIdOrThrow(job.user_id);
          if (
            user.status !== 'active' ||
            user.email !== job.recipient ||
            !notificationChannels(job.type, user.notificationPreferences).email
          ) {
            await this.finish(job.id, token, 'skipped');
            continue;
          }
          await this.email.send(job.recipient, job.subject, job.html, {
            idempotencyKey: `notification/${job.notification_id}`,
            sender: job.sender,
          });
          await this.finish(job.id, token, 'sent');
        } catch (error) {
          const exhausted = job.attempts >= MAX_ATTEMPTS;
          const delaySeconds = Math.min(900, 30 * 2 ** (job.attempts - 1));
          await this.deliveries.query(
            `UPDATE notification_emails SET status = $3,
            available_at = NOW() + $4 * INTERVAL '1 second', locked_until = NULL, lease_token = NULL
            WHERE id = $1 AND lease_token = $2`,
            [job.id, token, exhausted ? 'failed' : 'pending', delaySeconds],
          );
          this.logger.warn(
            `Notification email attempt failed id=${job.id} attempts=${job.attempts} error=${error instanceof Error ? error.name : 'unknown'}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      this.logger.warn(
        `Notification delivery job failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async finish(id: string, token: string, status: 'sent' | 'skipped') {
    await this.deliveries.query(
      `UPDATE notification_emails SET status = $3::varchar,
      sent_at = CASE WHEN $3::varchar = 'sent' THEN NOW() ELSE NULL END,
      subject = NULL, html = NULL, locked_until = NULL, lease_token = NULL
      WHERE id = $1 AND lease_token = $2`,
      [id, token, status],
    );
  }
}
