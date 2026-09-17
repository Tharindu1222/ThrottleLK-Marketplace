'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatNotificationWhen,
  notificationHref,
  type AppNotification,
} from '@/components/notifications-bell';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

const POLL_MS = 30_000;

export function AdminNotificationsBell({ locale }: { locale: Locale }) {
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
    setItems(list.slice(0, 8));
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

  if (!token) {
    return (
      <span className="rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-2.5 text-[var(--admin-muted)] opacity-50">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </span>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-2.5 text-[var(--admin-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            setError(null);
            void refresh(token).catch((err) =>
              setError(err instanceof Error ? err.message : 'Failed to load'),
            );
          }
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              Notifications
            </p>
            <button
              type="button"
              disabled={busy || unread === 0}
              className="text-xs text-[var(--admin-accent-2)] underline disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void apiSend('/api/v1/notifications/read-all', {
                  method: 'PATCH',
                  token,
                })
                  .then(() => refresh(token))
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : 'Failed',
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <p className="px-4 py-3 text-sm text-[var(--admin-danger)]">
                {error}
              </p>
            ) : null}
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--admin-muted)]">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => {
                const href = notificationHref(locale, n);
                return (
                  <div
                    key={n.id}
                    className={`border-b border-[var(--admin-border)] px-4 py-3 last:border-b-0 ${
                      n.readAt
                        ? 'bg-transparent'
                        : 'bg-[var(--admin-accent-soft)]/40'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setOpen(false);
                        if (!n.readAt) {
                          void apiSend(`/api/v1/notifications/${n.id}/read`, {
                            method: 'PATCH',
                            token,
                          })
                            .then(() => refresh(token))
                            .catch(() => undefined);
                        }
                        if (href) router.push(href);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--admin-text)]">
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--admin-faint)]">
                          {formatNotificationWhen(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {n.message}
                      </p>
                    </button>
                    {href ? (
                      <Link
                        href={href}
                        className="mt-2 inline-block text-xs text-[var(--admin-accent-2)] underline"
                        onClick={() => setOpen(false)}
                      >
                        {n.type === 'listing_pending_review'
                          ? 'Review listing'
                          : n.dataJson?.conversationId
                            ? 'Open conversation'
                            : 'View listing'}
                      </Link>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
