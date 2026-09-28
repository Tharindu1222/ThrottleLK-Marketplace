import { assertSafeImageBuffer } from './image-bytes';

const jpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);
const webp = Buffer.alloc(16, 0);
webp.write('RIFF', 0);
webp.write('WEBP', 8);

describe('assertSafeImageBuffer', () => {
  it('accepts JPEG, PNG, and WebP magic bytes', () => {
    expect(assertSafeImageBuffer(jpeg, 'image/jpeg')).toBe('image/jpeg');
    expect(assertSafeImageBuffer(png, 'image/png')).toBe('image/png');
    expect(assertSafeImageBuffer(webp, 'image/webp')).toBe('image/webp');
  });

  it('rejects MIME/magic mismatch and HTML polyglots', () => {
    expect(() => assertSafeImageBuffer(jpeg, 'image/png')).toThrow();
    const html = Buffer.from('<html><script>alert(1)</script>........', 'utf8');
    expect(() => assertSafeImageBuffer(html, 'image/jpeg')).toThrow();
  });
});
