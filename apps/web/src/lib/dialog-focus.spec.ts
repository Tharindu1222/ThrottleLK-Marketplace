import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextTabTarget } from './dialog-focus';

describe('nextTabTarget', () => {
  const first = 'close';
  const last = 'next';
  const focusable = [first, 'prev', last];

  it('wraps Tab from the last control to the first', () => {
    assert.equal(
      nextTabTarget({
        shiftKey: false,
        active: last,
        focusable,
        isInside: true,
      }),
      first,
    );
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    assert.equal(
      nextTabTarget({
        shiftKey: true,
        active: first,
        focusable,
        isInside: true,
      }),
      last,
    );
  });

  it('pulls focus back in when Tab is pressed outside the dialog', () => {
    assert.equal(
      nextTabTarget({
        shiftKey: false,
        active: 'other',
        focusable,
        isInside: false,
      }),
      first,
    );
    assert.equal(
      nextTabTarget({
        shiftKey: true,
        active: 'other',
        focusable,
        isInside: false,
      }),
      last,
    );
  });

  it('leaves Tab alone between inner controls', () => {
    assert.equal(
      nextTabTarget({
        shiftKey: false,
        active: first,
        focusable,
        isInside: true,
      }),
      'default',
    );
  });
});
