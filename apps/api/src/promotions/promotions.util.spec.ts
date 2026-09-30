import {
  addUtcDays,
  buildPreviewIds,
  interleaveIds,
  normalizeWhatsappDigits,
} from './promotions.util';

describe('buildPreviewIds', () => {
  it('puts featured ids first and fills to the limit without duplicates', () => {
    expect(
      buildPreviewIds(['a', 'b'], ['b', 'c', 'd', 'e'], 4),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns only featured when they already fill the limit', () => {
    expect(buildPreviewIds(['a', 'b', 'c'], ['d'], 2)).toEqual(['a', 'b']);
  });
});

describe('interleaveIds', () => {
  it('alternates two lists then leftover items', () => {
    expect(interleaveIds(['s1', 's2'], ['m1'], 4)).toEqual(['s1', 'm1', 's2']);
  });

  it('keeps the second list when the first is empty', () => {
    expect(interleaveIds([], ['m1', 'm2'], 4)).toEqual(['m1', 'm2']);
  });
});

describe('normalizeWhatsappDigits', () => {
  it('rewrites a local 0-prefix number to 94', () => {
    expect(normalizeWhatsappDigits('0771234567')).toBe('94771234567');
  });

  it('strips non-digits', () => {
    expect(normalizeWhatsappDigits('+94 77-123 4567')).toBe('94771234567');
  });

  it('does not double-prefix numbers that already include 94', () => {
    expect(normalizeWhatsappDigits('94771234567')).toBe('94771234567');
  });
});

describe('addUtcDays', () => {
  it('adds whole days', () => {
    const start = new Date('2026-09-25T10:00:00.000Z');
    expect(addUtcDays(start, 7).toISOString()).toBe(
      '2026-10-02T10:00:00.000Z',
    );
  });
});
