'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  formatNotificationWhen,
  notificationHref,
  type AppNotification,
} from '@/components/notifications-bell';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

const cardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

export function NotificationsClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    setItems(
      await apiGet<AppNotification[]>('/api/v1/notifications', {
        token: access,
      }),
    );
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
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <p className="text-sm text-muted">
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/notifications`)}`}
            className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
          >
            {t(locale, 'login')}
          </Link>
        </p>
      </div>
    );
  }

  async function openItem(n: AppNotification) {
    if (!n.readAt) {
      try {
        await apiSend(`/api/v1/notifications/${n.id}/read`, {
          method: 'PATCH',
          token: token!,
        });
        await load(token!);
      } catch {
        /* ignore */
      }
    }
    const href = notificationHref(locale, n);
    if (href) router.push(href);
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy || items.every((n) => n.readAt)}
          className="text-sm text-muted transition hover:text-accent disabled:opacity-40"
          onClick={() => {
            setBusy(true);
            void apiSend('/api/v1/notifications/read-all', {
              method: 'PATCH',
              token,
            })
              .then(() => load(token))
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Failed'),
              )
              .finally(() => setBusy(false));
          }}
        >
          {t(locale, 'markAllRead')}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-muted">{t(locale, 'noNotifications')}</p>
        </div>
      ) : (
        <div className={cardClass}>
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`block w-full border-b border-black/10 px-5 py-4 text-left transition last:border-b-0 hover:bg-surface/60 sm:px-6 ${
                n.readAt ? 'bg-white' : 'bg-accent/[0.03]'
              }`}
              onClick={() => void openItem(n)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
                  {n.title}
                </p>
                <span className="shrink-0 text-xs text-muted">
                  {formatNotificationWhen(n.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.message}</p>
              {notificationHref(locale, n) ? (
                <span className="mt-2 inline-block text-xs font-medium text-muted">
                  {n.dataJson?.conversationId
                    ? t(locale, 'openConversation')
                    : n.type.startsWith('dealer_')
                      ? t(locale, 'viewShowroom')
                      : t(locale, 'viewListing')}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
