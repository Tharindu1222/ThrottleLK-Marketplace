'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type ConversationRow = {
  id: string;
  listingTitle: string;
  listingSlug: string | null;
  lastMessageAt: string | null;
  role: 'buyer' | 'seller';
};

export function MessagesInbox({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void apiGet<ConversationRow[]>('/api/v1/conversations', { token: access })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-muted">{t(locale, 'noMessages')}</p>
      ) : (
        items.map((row) => (
          <Link
            key={row.id}
            href={`/${locale}/account/messages/${row.id}`}
            className="block border border-black/10 bg-surface/40 p-4 hover:border-accent/40"
          >
            <p className="font-[family-name:var(--font-display)] text-xl tracking-wide">
              {row.listingTitle}
            </p>
            <p className="mt-1 text-sm text-muted">
              {row.role === 'seller' ? t(locale, 'asSeller') : t(locale, 'asBuyer')}
              {row.lastMessageAt
                ? ` · ${new Date(row.lastMessageAt).toLocaleString()}`
                : ''}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}
