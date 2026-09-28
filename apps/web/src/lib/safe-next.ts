export function safeNextPath(
  next: string | null | undefined,
  locale: string,
  fallback?: string,
): string {
  const home = fallback ?? `/${locale}/bikes`;
  if (!next) return home;
  if (next.includes('\\') || next.includes('//') || next.includes('@')) {
    return home;
  }
  const decoded = decodeURIComponent(next);
  if (decoded.includes('\\') || decoded.includes('//')) return home;
  const prefix = `/${locale}/`;
  if (!decoded.startsWith(prefix)) return home;
  if (decoded.startsWith(`${prefix}admin`) && !fallback?.includes('/admin')) {
    return home;
  }
  return decoded;
}
