const DEFAULT_PREVIEW_LIMIT = 8;

/** Interleave two catalogs, then fill leftovers, up to `limit` unique items. */
export function pickPreviewItems<T extends { id: string }>(
  primary: T[],
  secondary: T[] = [],
  limit = DEFAULT_PREVIEW_LIMIT,
): T[] {
  const picked: T[] = [];
  const seen = new Set<string>();

  const push = (item: T | undefined) => {
    if (!item || seen.has(item.id) || picked.length >= limit) return;
    seen.add(item.id);
    picked.push(item);
  };

  const maxLen = Math.max(primary.length, secondary.length);
  for (let i = 0; i < maxLen && picked.length < limit; i++) {
    push(primary[i]);
    push(secondary[i]);
  }

  return picked;
}
