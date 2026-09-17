/** Compact page-number list with ellipsis for large totals. */
export function visiblePageNumbers(
  current: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, current]);
  for (const delta of [-2, -1, 1, 2]) {
    const n = current + delta;
    if (n > 1 && n < totalPages) set.add(n);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) result.push('ellipsis');
    result.push(n);
    prev = n;
  }
  return result;
}

export function pageRange(page: number, limit: number, total: number) {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return { from, to };
}
