'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  dataJson?: {
    slug?: string;
    conversationId?: string;
    listingId?: string;
    dealerId?: string;
  } | null;
};

export function notificationHref(
  locale: Locale,
  n: AppNotification,
): string | null {
  const data = n.dataJson;
  if (!data) return null;
  if (data.conversationId) {
    return `/${locale}/account/messages/${data.conversationId}`;
  }
  if (n.type.startsWith('dealer_') && data.slug) {
    return `/${locale}/dealers/${data.slug}`;
  }
  if (n.type.startsWith('dealer_')) {
    return `/${locale}/dealers/apply`;
  }
  if (data.slug) {
    return `/${locale}/bikes/${data.slug}`;
  }
  return null;
}

export function formatNotificationWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const DROPDOWN_LIMIT = 8;
const POLL_MS = 30_000;

export function NotificationsBell({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (access: string) => {
    const [list, count] = await Promise.all([
      apiGet<AppNotification[]>('/api/v1/notifications', { token: access }),
      apiGet<{ count: number }>('/api/v1/notifications/unread-count', {
        token: access,
      }),
    ]);
    setItems(list.slice(0, DROPDOWN_LIMIT));
    setUnread(count.count);
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void refresh(access).catch(() => undefined);
    const id = window.setInterval(() => {
      void refresh(access).catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!token) return null;

  async function markRead(id: string) {
    await apiSend(`/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
      token: token!,
    });
  }

  async function openNotification(n: AppNotification) {
    if (!n.readAt) {
      try {
        await markRead(n.id);
        await refresh(token!);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    const href = notificationHref(locale, n);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center text-muted transition hover:text-foreground"
        aria-label={t(locale, 'notifications')}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            setError(null);
            void refresh(token).catch((err) =>
              setError(err instanceof Error ? err.message : 'Failed'),
            );
          }
        }}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground">
              {t(locale, 'notifications')}
            </p>
            <button
              type="button"
              disabled={busy || unread === 0}
              className="text-xs text-muted transition hover:text-accent disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void apiSend('/api/v1/notifications/read-all', {
                  method: 'PATCH',
                  token,
                })
                  .then(() => refresh(token))
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : 'Failed'),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {t(locale, 'markAllRead')}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <p className="px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {t(locale, 'noNotifications')}
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full border-b border-black/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface/80 ${
                    n.readAt ? 'bg-white' : 'bg-accent/[0.04]'
                  }`}
                  onClick={() => void openNotification(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted">
                      {formatNotificationWhen(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {n.message}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-black/10 px-4 py-3">
            <Link
              href={`/${locale}/account/notifications`}
              className="text-sm font-medium text-foreground transition hover:text-accent"
              onClick={() => setOpen(false)}
            >
              {t(locale, 'viewAllNotifications')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
