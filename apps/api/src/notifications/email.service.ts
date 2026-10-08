import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  sender(): string {
    return (
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      'ThrottleLK <onboarding@resend.dev>'
    );
  }

  async send(
    to: string,
    subject: string,
    html: string,
    options?: { idempotencyKey?: string; sender?: string },
  ): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from = options?.sender ?? this.sender();
    const production =
      (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) ===
      'production';

    if (!apiKey) {
      if (production) {
        throw new ServiceUnavailableException({
          success: false,
          error: {
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'Transactional email is not configured',
          },
        });
      }
      this.logger.log(`[email:dev] to=${to} subject=${subject}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(options?.idempotencyKey
          ? { 'Idempotency-Key': options.idempotencyKey }
          : {}),
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      this.logger.warn(`Resend failed status=${res.status}`);
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Could not send email',
        },
      });
    }
  }
}
