import { it } from 'node:test';
import assert from 'node:assert/strict';
import { sitemapChunks, sitemapChunk } from './sitemap-chunks';

it('covers a large sitemap without duplicate URLs or exceeding the file limit', () => {
  const entries = Array.from({ length: 105001 }, (_, i) => ({
    url: `https://example.com/bikes/${i}`,
  }));
  const chunks = sitemapChunks(entries).map(({ id }) =>
    sitemapChunk(entries, id),
  );
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((chunk) => chunk.length < 50000));
  assert.deepEqual(chunks.flat(), entries);
  assert.equal(new Set(chunks.flat().map((e) => e.url)).size, entries.length);
});
