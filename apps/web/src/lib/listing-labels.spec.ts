import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listingConditionLabel,
  listingFuelLabel,
  listingTransmissionLabel,
} from './listing-labels';

describe('listing labels', () => {
  it('maps condition / fuel / transmission through t() for Sinhala', () => {
    assert.equal(listingConditionLabel('si', 'used'), 'පාවිච්චි කළ');
    assert.equal(listingFuelLabel('si', 'petrol'), 'පෙට්‍රල්');
    assert.equal(listingTransmissionLabel('si', 'manual'), 'මැනුවල්');
  });

  it('falls back to a readable English title for unknown values', () => {
    assert.equal(listingConditionLabel('en', 'mint_condition'), 'Mint Condition');
  });
});
