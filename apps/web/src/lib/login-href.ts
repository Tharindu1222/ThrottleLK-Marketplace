export function loginHref(locale: string, nextPath?: string | null): string {
  const base = `/${locale}/login`;
  if (!nextPath) return base;
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return base;
  return `${base}?next=${encodeURIComponent(nextPath)}`;
}
