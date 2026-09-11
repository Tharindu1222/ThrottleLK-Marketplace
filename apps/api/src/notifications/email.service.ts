import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from =
      this.config.get<string>('EMAIL_FROM') ??
      'ThrottleLK <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.log(`[email:dev] to=${to} subject=${subject}`);
      return;
    }

    try {
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
      }
    } catch (err) {
      this.logger.warn(
        `Resend error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
