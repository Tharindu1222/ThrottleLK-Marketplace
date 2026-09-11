import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listingStatusSchema, loginSchema, registerSchema } from './index';

describe('listingStatusSchema', () => {
  it('accepts pending_review', () => {
    assert.equal(listingStatusSchema.parse('pending_review'), 'pending_review');
  });

  it('rejects published', () => {
    assert.throws(() => listingStatusSchema.parse('published'));
  });
});

describe('registerSchema', () => {
  it('rejects bad email', () => {
    assert.throws(() =>
      registerSchema.parse({
        firstName: 'A',
        lastName: 'B',
        email: 'not-an-email',
        password: 'password1',
      }),
    );
  });
});

describe('loginSchema', () => {
  it('requires password min 8', () => {
    assert.throws(() =>
      loginSchema.parse({
        email: 'a@b.com',
        password: 'short',
      }),
    );
  });
});
