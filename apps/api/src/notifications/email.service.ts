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

  async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from =
      this.config.get<string>('EMAIL_FROM') ??
      'ThrottleLK <onboarding@resend.dev>';
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
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.warn(`Resend failed ${res.status}: ${body}`);
      if (production) {
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
}
