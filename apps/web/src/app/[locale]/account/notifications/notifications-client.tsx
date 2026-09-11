'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  dataJson?: { slug?: string } | null;
};

export function NotificationsClient({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(access: string) {
    setItems(await apiGet<Notification[]>('/api/v1/notifications', { token: access }));
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
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
    <div className="mt-8 space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-accent underline"
          onClick={() => {
            void apiSend('/api/v1/notifications/read-all', {
              method: 'PATCH',
              token,
            })
              .then(() => load(token))
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Failed'),
              );
          }}
        >
          Mark all read
        </button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-muted">No notifications yet.</p>
      ) : (
        items.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`block w-full border border-white/10 p-4 text-left ${
              n.readAt ? 'bg-surface/20' : 'bg-surface/50'
            }`}
            onClick={() => {
              void apiSend(`/api/v1/notifications/${n.id}/read`, {
                method: 'PATCH',
                token,
              })
                .then(() => load(token))
                .catch(() => undefined);
            }}
          >
            <p className="font-[family-name:var(--font-display)] text-lg">
              {n.title}
            </p>
            <p className="mt-1 text-sm text-muted">{n.message}</p>
            {n.dataJson?.slug ? (
              <Link
                href={`/${locale}/bikes/${n.dataJson.slug}`}
                className="mt-2 inline-block text-sm text-accent underline"
                onClick={(e) => e.stopPropagation()}
              >
                View listing
              </Link>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}
