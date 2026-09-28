import { resolveObjectBucket } from './object-bucket';

describe('resolveObjectBucket', () => {
  it('stores public objects in the public bucket', () => {
    expect(
      resolveObjectBucket({
        publicBucket: 'cdn',
        privateBucket: 'vault',
        access: 'public',
      }),
    ).toEqual({ bucket: 'cdn', exposePublicUrl: true });
  });

  it('stores private objects in the private bucket', () => {
    expect(
      resolveObjectBucket({
        publicBucket: 'cdn',
        privateBucket: 'vault',
        access: 'private',
      }),
    ).toEqual({ bucket: 'vault', exposePublicUrl: false });
  });

  it('refuses production private uploads when the private bucket is missing or public', () => {
    expect(() =>
      resolveObjectBucket({
        publicBucket: 'cdn',
        access: 'private',
        production: true,
      }),
    ).toThrow(/R2_PRIVATE_BUCKET/);
    expect(() =>
      resolveObjectBucket({
        publicBucket: 'cdn',
        privateBucket: 'cdn',
        access: 'private',
        production: true,
      }),
    ).toThrow(/R2_PRIVATE_BUCKET/);
  });

  it('falls back to the public bucket for private objects outside production', () => {
    expect(
      resolveObjectBucket({
        publicBucket: 'cdn',
        access: 'private',
        production: false,
      }),
    ).toEqual({ bucket: 'cdn', exposePublicUrl: false });
  });
});
