import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { whatsappHref } from './whatsapp';

describe('whatsappHref', () => {
  it('maps local 0-prefix numbers to 94', () => {
    assert.equal(whatsappHref('0771234567'), 'https://wa.me/94771234567');
  });

  it('does not double-prefix numbers that already include 94', () => {
    assert.equal(whatsappHref('+94 77 123 4567'), 'https://wa.me/94771234567');
    assert.equal(whatsappHref('94771234567'), 'https://wa.me/94771234567');
  });
});
