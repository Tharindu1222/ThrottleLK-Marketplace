/** Keys in `patch` whose values differ from what is already stored. */
export function changedKeys(current: object, patch: object): string[] {
  const stored = current as Record<string, unknown>;
  const next = patch as Record<string, unknown>;
  return Object.keys(next).filter((key) => {
    if (next[key] === undefined) return false;
    return !sameStoredValue(stored[key], next[key]);
  });
}

function sameStoredValue(current: unknown, next: unknown): boolean {
  if (typeof next === 'number' || typeof current === 'number') {
    const left = current == null || current === '' ? null : Number(current);
    const right = next == null || next === '' ? null : Number(next);
    return left === right;
  }
  if (typeof next === 'boolean' || typeof current === 'boolean') {
    return Boolean(current) === Boolean(next);
  }
  const left = current == null ? '' : String(current).trim();
  const right = next == null ? '' : String(next).trim();
  return left === right;
}
