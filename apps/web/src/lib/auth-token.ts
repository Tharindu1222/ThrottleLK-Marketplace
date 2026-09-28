/** Move ?token= into the hash and strip it from the query (history/logs). */
export function consumeAuthTokenFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('token');
  const fromHash = url.hash.replace(/^#/, '');
  const token = fromQuery || fromHash;
  if (fromQuery) {
    url.searchParams.delete('token');
    url.hash = fromQuery;
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  return token;
}
