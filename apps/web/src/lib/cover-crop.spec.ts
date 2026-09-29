import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampCoverFocus, coverObjectPosition } from './cover-crop';

describe('clampCoverFocus', () => {
  it('defaults missing/NaN to 50 and clamps to 0–100', () => {
    assert.equal(clampCoverFocus(undefined), 50);
    assert.equal(clampCoverFocus(null), 50);
    assert.equal(clampCoverFocus(Number.NaN), 50);
    assert.equal(clampCoverFocus(-10), 0);
    assert.equal(clampCoverFocus(150), 100);
    assert.equal(clampCoverFocus(33), 33);
  });
});

describe('coverObjectPosition', () => {
  it('formats CSS object-position', () => {
    assert.equal(coverObjectPosition(20, 80), '20% 80%');
    assert.equal(coverObjectPosition(undefined, undefined), '50% 50%');
  });
});
