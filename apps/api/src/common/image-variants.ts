import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { sniffImageMime } from './image-bytes';

export const MAX_INPUT_PIXELS = 40_000_000;
export const CARD_MAX_WIDTH = 480;
export const DISPLAY_MAX_WIDTH = 1600;
export const AVATAR_MAX_WIDTH = 256;
export const LOGO_MAX_WIDTH = 512;
export const PUBLIC_IMAGE_CACHE_CONTROL =
  'public, max-age=31536000, immutable';

export type MarketplaceImagePreset = 'photo' | 'avatar' | 'logo';

export type EncodedMarketplaceImage = {
  display: { buffer: Buffer; contentType: 'image/webp' };
  card?: { buffer: Buffer; contentType: 'image/webp' };
  width: number;
  height: number;
};

export function cardStorageKey(displayKey: string): string {
  return displayKey.replace(/\.[^./]+$/, '-card.webp');
}

export function relatedPublicImageKeys(displayKey: string): string[] {
  const card = cardStorageKey(displayKey);
  return card === displayKey ? [displayKey] : [displayKey, card];
}

export function preferredCoverUrl(image: {
  imageUrl: string;
  thumbnailUrl?: string | null;
}): string {
  return image.thumbnailUrl || image.imageUrl;
}

function invalidImage(): never {
  throw new BadRequestException({
    success: false,
    error: {
      code: 'INVALID_IMAGE',
      message: 'Image could not be processed',
    },
  });
}

function displayMaxWidth(preset: MarketplaceImagePreset): number {
  if (preset === 'avatar') return AVATAR_MAX_WIDTH;
  if (preset === 'logo') return LOGO_MAX_WIDTH;
  return DISPLAY_MAX_WIDTH;
}

export async function encodeMarketplaceImages(
  buffer: Buffer,
  preset: MarketplaceImagePreset = 'photo',
  options?: { maxPixels?: number },
): Promise<EncodedMarketplaceImage> {
  if (!sniffImageMime(buffer)) invalidImage();
  const maxPixels = options?.maxPixels ?? MAX_INPUT_PIXELS;
  if (maxPixels <= 0) invalidImage();

  let pipeline: ReturnType<typeof sharp>;
  try {
    pipeline = sharp(buffer, {
      failOn: 'truncated',
      limitInputPixels: maxPixels,
    }).rotate();
  } catch {
    invalidImage();
  }

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await pipeline.metadata();
  } catch {
    invalidImage();
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height || width * height > maxPixels) invalidImage();

  try {
    const displayBuf = await pipeline
      .clone()
      .resize({
        width: displayMaxWidth(preset),
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 2 })
      .toBuffer();

    if (preset !== 'photo') {
      return {
        display: { buffer: displayBuf, contentType: 'image/webp' },
        width,
        height,
      };
    }

    const cardBuf = await pipeline
      .clone()
      .resize({
        width: CARD_MAX_WIDTH,
        withoutEnlargement: true,
      })
      .webp({ quality: 75, effort: 2 })
      .toBuffer();

    return {
      display: { buffer: displayBuf, contentType: 'image/webp' },
      card: { buffer: cardBuf, contentType: 'image/webp' },
      width,
      height,
    };
  } catch {
    invalidImage();
  }
}

export type PublicObjectStore = {
  putObject: (
    storageKey: string,
    buffer: Buffer,
    contentType: string,
    options?: { access?: 'public' | 'private'; cacheControl?: string },
  ) => Promise<{ storageKey: string; publicUrl: string }>;
  deleteObject: (storageKey: string) => Promise<void>;
};

export async function storePublicMarketplaceImage(
  storage: PublicObjectStore,
  keyPrefix: string,
  buffer: Buffer,
  preset: MarketplaceImagePreset = 'photo',
): Promise<{ storageKey: string; imageUrl: string; thumbnailUrl: string }> {
  const encoded = await encodeMarketplaceImages(buffer, preset);
  const storageKey = `${keyPrefix}.webp`;
  const display = await storage.putObject(
    storageKey,
    encoded.display.buffer,
    'image/webp',
    { cacheControl: PUBLIC_IMAGE_CACHE_CONTROL },
  );
  let thumbnailUrl = display.publicUrl;
  if (encoded.card) {
    const card = await storage.putObject(
      cardStorageKey(storageKey),
      encoded.card.buffer,
      'image/webp',
      { cacheControl: PUBLIC_IMAGE_CACHE_CONTROL },
    );
    thumbnailUrl = card.publicUrl;
  }
  return {
    storageKey: display.storageKey,
    imageUrl: display.publicUrl,
    thumbnailUrl,
  };
}

export async function deletePublicMarketplaceImage(
  storage: PublicObjectStore,
  storageKey: string,
): Promise<void> {
  for (const key of relatedPublicImageKeys(storageKey)) {
    await storage.deleteObject(key).catch(() => undefined);
  }
}
