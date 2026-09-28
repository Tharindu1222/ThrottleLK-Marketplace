export type RefreshVerdict = 'ok' | 'invalid' | 'reuse';

export function classifyRefreshSession(input: {
  session: {
    userId: string;
    revokedAt: Date | null;
    expiresAt: Date;
  } | null;
  payloadSub: string;
  now?: number;
}): RefreshVerdict {
  const session = input.session;
  if (!session) return 'invalid';
  if (session.userId !== input.payloadSub) return 'invalid';
  const now = input.now ?? Date.now();
  if (session.expiresAt.getTime() < now) return 'invalid';
  if (session.revokedAt) return 'reuse';
  return 'ok';
}
