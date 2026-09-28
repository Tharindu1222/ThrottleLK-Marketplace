import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  cardStorageKey,
  encodeMarketplaceImages,
  preferredCoverUrl,
  relatedPublicImageKeys,
} from './image-variants';

describe('image variant keys', () => {
  it('stores a card sibling next to the display webp', () => {
    expect(cardStorageKey('listings/abc/photo.webp')).toBe(
      'listings/abc/photo-card.webp',
    );
    expect(relatedPublicImageKeys('listings/abc/photo.webp')).toEqual([
      'listings/abc/photo.webp',
      'listings/abc/photo-card.webp',
    ]);
  });

  it('prefers thumbnail URLs on browse cards', () => {
    expect(
      preferredCoverUrl({
        imageUrl: 'https://cdn.example/full.webp',
        thumbnailUrl: 'https://cdn.example/card.webp',
      }),
    ).toBe('https://cdn.example/card.webp');
    expect(
      preferredCoverUrl({
        imageUrl: 'https://cdn.example/full.jpg',
        thumbnailUrl: null,
      }),
    ).toBe('https://cdn.example/full.jpg');
  });
});

describe('encodeMarketplaceImages', () => {
  async function jpegBuffer(width = 32, height = 24) {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 20, b: 20 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  it('rejects non-image bytes', async () => {
    await expect(
      encodeMarketplaceImages(Buffer.from('not-an-image'), 'photo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('encodes a jpeg into webp display and card buffers', async () => {
    const out = await encodeMarketplaceImages(await jpegBuffer(), 'photo');
    expect(out.display.contentType).toBe('image/webp');
    expect(out.card?.contentType).toBe('image/webp');
    expect(out.display.buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(out.card?.buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });

  it('rejects images above the pixel budget', async () => {
    await expect(
      encodeMarketplaceImages(await jpegBuffer(), 'photo', { maxPixels: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
