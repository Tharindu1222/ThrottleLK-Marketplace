import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeJsonLd } from './json-ld';

describe('safeJsonLd', () => {
  it('escapes script-breaking less-than characters', () => {
    const html = safeJsonLd({
      name: '</script><script>alert(1)</script>',
    });
    assert.equal(html.includes('</script>'), false);
    assert.equal(html.includes('\\u003c/script>'), true);
  });
});
