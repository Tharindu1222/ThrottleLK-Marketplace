import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  contactListingSchema,
  createReportSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from './index';

describe('optional captchaToken on public schemas', () => {
  it('keeps login valid without captchaToken', () => {
    const parsed = loginSchema.parse({
      email: 'a@b.com',
      password: 'password1',
    });
    assert.equal(parsed.captchaToken, undefined);
  });

  it('accepts captchaToken on register', () => {
    const parsed = registerSchema.parse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'password1',
      captchaToken: 'turnstile-token',
    });
    assert.equal(parsed.captchaToken, 'turnstile-token');
  });

  it('accepts captchaToken on contact and report', () => {
    contactListingSchema.parse({
      buyerName: 'Nimal Perera',
      buyerPhone: '0771234567',
      message: 'Is this bike still available please?',
      captchaToken: 'token',
    });
    createReportSchema.parse({
      listingId: '11111111-1111-4111-8111-111111111111',
      reason: 'spam',
      description: 'This listing looks like spam to me.',
      captchaToken: 'token',
    });
    forgotPasswordSchema.parse({
      email: 'a@b.com',
      captchaToken: 'token',
    });
  });
});
