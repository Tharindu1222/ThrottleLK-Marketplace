import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDealerSchema,
  updateDealerProfileSchema,
} from './index';

const validDealer = {
  name: 'Island Motors',
  phone: '0771234567',
  districtId: '11111111-1111-4111-8111-111111111111',
  cityId: '22222222-2222-4222-8222-222222222222',
};

describe('dealer website and social URLs', () => {
  it('accepts https dealer websites', () => {
    const parsed = createDealerSchema.parse({
      ...validDealer,
      website: 'https://islandmotors.lk',
    });
    assert.equal(parsed.website, 'https://islandmotors.lk');
  });

  it('rejects javascript: dealer websites', () => {
    assert.throws(() =>
      createDealerSchema.parse({
        ...validDealer,
        website: 'javascript:alert(1)',
      }),
    );
  });

  it('rejects data: social URLs on profile update', () => {
    assert.throws(() =>
      updateDealerProfileSchema.parse({
        facebookUrl: 'data:text/html,<script>alert(1)</script>',
      }),
    );
  });

  it('rejects ftp: websites', () => {
    assert.throws(() =>
      updateDealerProfileSchema.parse({
        website: 'ftp://files.example.com/steal',
      }),
    );
  });
});
