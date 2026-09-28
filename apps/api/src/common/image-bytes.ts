import { BadRequestException } from '@nestjs/common';

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const POLYLOT = /<\s*(html|script|iframe|svg)\b|<\?php|<%/i;

export function sniffImageMime(buffer: Buffer): ImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function assertSafeImageBuffer(
  buffer: Buffer,
  claimedMime?: string,
): ImageMime {
  const sniff = sniffImageMime(buffer);
  if (!sniff) {
    throw new BadRequestException({
      success: false,
      error: {
        code: 'INVALID_TYPE',
        message: 'File is not a JPEG, PNG, or WebP image',
      },
    });
  }
  if (claimedMime && claimedMime !== sniff) {
    throw new BadRequestException({
      success: false,
      error: {
        code: 'INVALID_TYPE',
        message: 'File type does not match the image contents',
      },
    });
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8');
  if (POLYLOT.test(head)) {
    throw new BadRequestException({
      success: false,
      error: {
        code: 'INVALID_TYPE',
        message: 'File contains embedded markup and was rejected',
      },
    });
  }
  return sniff;
}

export function assertSafeImageFile(file?: Express.Multer.File): ImageMime {
  if (!file?.buffer?.length) {
    throw new BadRequestException({
      success: false,
      error: { code: 'FILE_REQUIRED', message: 'Image file is required' },
    });
  }
  return assertSafeImageBuffer(file.buffer, file.mimetype);
}

export function extensionForMime(mime: ImageMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
