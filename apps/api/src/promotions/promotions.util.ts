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

export function normalizeWhatsappDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('94')) return digits;
  if (digits.startsWith('0')) return `94${digits.slice(1)}`;
  return `94${digits}`;
}

export function addUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}
