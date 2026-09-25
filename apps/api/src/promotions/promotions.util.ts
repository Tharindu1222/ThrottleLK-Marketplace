export const SLIP_MAX_BYTES = 5 * 1024 * 1024;

export const SLIP_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export function buildPreviewIds(
  featuredIds: string[],
  fillIds: string[],
  limit = 8,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of featuredIds) {
    if (out.length >= limit) break;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of fillIds) {
    if (out.length >= limit) break;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function interleaveIds(
  primary: string[],
  secondary: string[],
  limit = 8,
): string[] {
  const mixed: string[] = [];
  const max = Math.max(primary.length, secondary.length);
  for (let i = 0; i < max; i++) {
    if (primary[i]) mixed.push(primary[i]);
    if (secondary[i]) mixed.push(secondary[i]);
  }
  return buildPreviewIds([], mixed, limit);
}

export function assertSlipFile(file?: {
  mimetype: string;
  size: number;
}): void {
  if (!file) {
    throw new Error('FILE_REQUIRED');
  }
  if (!SLIP_MIMES.has(file.mimetype)) {
    throw new Error('INVALID_TYPE');
  }
  if (file.size > SLIP_MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
}

export function normalizeWhatsappDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return `94${digits.slice(1)}`;
  return digits;
}

export function addUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

export function slipExtension(mimetype: string): string {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'jpg';
}
