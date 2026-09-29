import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export type PayHereCheckoutParams = {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  items: string;
};

@Injectable()
export class PayHereService {
  constructor(private readonly config: ConfigService) {}

  requireMerchantId(): string {
    const id = this.config.get<string>('PAYHERE_MERCHANT_ID')?.trim();
    if (!id) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'PAYHERE_NOT_CONFIGURED',
          message: 'PayHere merchant is not configured',
        },
      });
    }
    return id;
  }

  merchantSecret(): string {
    return this.config.get<string>('PAYHERE_MERCHANT_SECRET')?.trim() ?? '';
  }

  currency(): string {
    return (
      this.config.get<string>('PAYHERE_CURRENCY')?.trim().toUpperCase() || 'LKR'
    );
  }

  mode(): 'sandbox' | 'live' {
    const mode = this.config.get<string>('PAYHERE_MODE')?.trim().toLowerCase();
    return mode === 'live' ? 'live' : 'sandbox';
  }

  checkoutUrl(): string {
    return this.mode() === 'live'
      ? 'https://www.payhere.lk/pay/checkout'
      : 'https://sandbox.payhere.lk/pay/checkout';
  }

  notifyUrl(): string {
    return this.config.get<string>('PAYHERE_NOTIFY_URL')?.trim() ?? '';
  }

  webUrl(): string {
    return (
      this.config.get<string>('WEB_URL')?.trim().replace(/\/$/, '') ||
      'http://localhost:3000'
    );
  }

  formatAmount(amountLkr: number): string {
    return Number(amountLkr).toFixed(2);
  }

  /** PayHere requires a valid phone; fall back for local sandbox tests. */
  normalizePhone(phone: string | null | undefined): string {
    const raw = (phone ?? '').replace(/[^\d+]/g, '');
    if (/^0\d{9}$/.test(raw)) return raw;
    if (/^\+94\d{9}$/.test(raw)) return `0${raw.slice(3)}`;
    if (/^94\d{9}$/.test(raw)) return `0${raw.slice(2)}`;
    return '0770000000';
  }

  /** Checkout hash: md5(merchant_id + order_id + amount + currency + md5(secret).toUpperCase()).toUpperCase() */
  buildCheckoutHash(params: {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
  }): string {
    const secretHash = this.md5(this.merchantSecret()).toUpperCase();
    return this.md5(
      params.merchantId +
        params.orderId +
        params.amount +
        params.currency +
        secretHash,
    ).toUpperCase();
  }

  /** Notify hash: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(secret).toUpperCase()).toUpperCase() */
  buildNotifyHash(params: {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
    statusCode: string;
  }): string {
    const secretHash = this.md5(this.merchantSecret()).toUpperCase();
    return this.md5(
      params.merchantId +
        params.orderId +
        params.amount +
        params.currency +
        params.statusCode +
        secretHash,
    ).toUpperCase();
  }

  verifyNotifyHash(params: {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
    statusCode: string;
    md5sig: string;
  }): boolean {
    const expected = this.buildNotifyHash(params);
    return expected === params.md5sig?.toUpperCase();
  }

  private md5(value: string): string {
    return createHash('md5').update(value, 'utf8').digest('hex');
  }
}
