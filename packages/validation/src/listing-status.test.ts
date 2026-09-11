import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listingStatusSchema } from './index';

describe('listingStatusSchema', () => {
  it('accepts pending_review', () => {
    assert.equal(listingStatusSchema.parse('pending_review'), 'pending_review');
  });

  it('rejects published', () => {
    assert.throws(() => listingStatusSchema.parse('published'));
  });
});
