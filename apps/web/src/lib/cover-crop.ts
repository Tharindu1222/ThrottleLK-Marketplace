/** Cover focal point helpers (0–100). Public + account previews share these. */

export function clampCoverFocus(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function coverObjectPosition(
  x?: number | null,
  y?: number | null,
): string {
  return `${clampCoverFocus(x)}% ${clampCoverFocus(y)}%`;
}

export type CroppedAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Export a cropped region as a JPEG File (long edge capped for upload size). */
export async function getCroppedCoverFile(
  imageSrc: string,
  crop: CroppedAreaPixels,
  fileName = 'cover.jpg',
  maxEdge = 1600,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxEdge / Math.max(crop.width, crop.height));
  const outW = Math.max(1, Math.round(crop.width * scale));
  const outH = Math.max(1, Math.round(crop.height * scale));
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop export failed'))),
      'image/jpeg',
      0.9,
    );
  });
  return new File([blob], fileName, { type: 'image/jpeg' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Image load failed')));
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.src = src;
  });
}
