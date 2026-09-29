import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('allows same-locale relative paths', () => {
    assert.equal(
      safeNextPath('/en/bikes/honda-dio', 'en'),
      '/en/bikes/honda-dio',
    );
  });

  it('rejects protocol-relative and backslash tricks', () => {
    assert.equal(safeNextPath('//evil.example', 'en'), '/en/bikes');
    assert.equal(safeNextPath('/en/\\evil', 'en'), '/en/bikes');
  });

  it('does not send buyers to admin', () => {
    assert.equal(safeNextPath('/en/admin', 'en'), '/en/bikes');
  });

  it('falls back when next is malformed percent-encoding', () => {
    assert.equal(safeNextPath('/en/%E0%A4%A', 'en'), '/en/bikes');
    assert.equal(safeNextPath('%', 'en'), '/en/bikes');
  });
});
