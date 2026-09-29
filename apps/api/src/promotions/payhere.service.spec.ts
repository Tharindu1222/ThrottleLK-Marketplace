import { createHash } from 'node:crypto';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { PayHereService } from './payhere.service';

function md5(value: string) {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

describe('PayHereService', () => {
  const env: Record<string, string> = {
    PAYHERE_MERCHANT_ID: '123456',
    PAYHERE_MERCHANT_SECRET: 'secret_value',
    PAYHERE_MODE: 'sandbox',
    PAYHERE_CURRENCY: 'LKR',
    PAYHERE_NOTIFY_URL: 'https://api.example/api/v1/promotions/payhere/notify',
    WEB_URL: 'http://localhost:3000',
  };

  let service: PayHereService;

  beforeEach(() => {
    service = new PayHereService({
      get: (key: string) => env[key],
    } as ConfigService);
  });

  afterEach(() => {
    env.PAYHERE_MERCHANT_ID = '123456';
    env.PAYHERE_MODE = 'sandbox';
  });

  it('formats amount with two decimals', () => {
    expect(service.formatAmount(1000)).toBe('1000.00');
    expect(service.formatAmount(0)).toBe('0.00');
  });

  it('builds checkout hash per PayHere formula', () => {
    const merchantId = '123456';
    const orderId = 'promo_abc';
    const amount = '1000.00';
    const currency = 'LKR';
    const secretHash = md5('secret_value').toUpperCase();
    const expected = md5(
      merchantId + orderId + amount + currency + secretHash,
    ).toUpperCase();
    expect(
      service.buildCheckoutHash({ merchantId, orderId, amount, currency }),
    ).toBe(expected);
  });

  it('verifies notify hash', () => {
    const merchantId = '123456';
    const orderId = 'promo_abc';
    const amount = '1000.00';
    const currency = 'LKR';
    const statusCode = '2';
    const secretHash = md5('secret_value').toUpperCase();
    const md5sig = md5(
      merchantId + orderId + amount + currency + statusCode + secretHash,
    ).toUpperCase();
    expect(
      service.verifyNotifyHash({
        merchantId,
        orderId,
        amount,
        currency,
        statusCode,
        md5sig,
      }),
    ).toBe(true);
    expect(
      service.verifyNotifyHash({
        merchantId,
        orderId,
        amount,
        currency,
        statusCode,
        md5sig: 'bad',
      }),
    ).toBe(false);
  });

  it('uses sandbox vs live checkout URLs', () => {
    expect(service.checkoutUrl()).toBe(
      'https://sandbox.payhere.lk/pay/checkout',
    );
    env.PAYHERE_MODE = 'live';
    expect(service.checkoutUrl()).toBe('https://www.payhere.lk/pay/checkout');
  });

  it('throws 503 when merchant id is missing', () => {
    env.PAYHERE_MERCHANT_ID = '';
    expect(() => service.requireMerchantId()).toThrow(
      ServiceUnavailableException,
    );
  });
});
