'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InboxEmpty,
  InboxSkeleton,
  InboxToolbar,
  inboxCardClass,
  type InboxFilter,
} from '@/components/account-inbox-chrome';
import { NotificationTypeIcon } from '@/components/notification-type-icon';
import {
  formatNotificationWhen,
  notificationHref,
  type AppNotification,
} from '@/components/notifications-bell';
import { Pagination } from '@/components/pagination';
import { apiGet, apiGetWithMeta, apiSend } from '@/lib/api';
import { watchNotifications } from '@/lib/notification-events';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useUrlPage } from '@/lib/use-url-page';
import type { PaginationMeta } from '@throttlelk/types';

export function NotificationsClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { page, goTo } = useUrlPage();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const sequence = useRef(0);

  const load = useCallback(
    async (
      access: string,
      pageNum = page,
      nextFilter = filter,
      foreground = true,
    ) => {
      const request = ++sequence.current;
      if (foreground) {
        setLoading(true);
        setError(null);
      }
      try {
        const [{ data, meta: nextMeta }, count] = await Promise.all([
          apiGetWithMeta<AppNotification[]>('/api/v1/notifications', {
            token: access,
            searchParams: {
              page: String(pageNum),
              limit: '20',
              ...(nextFilter === 'unread' ? { unread: '1' } : {}),
            },
          }),
          apiGet<{ count: number }>('/api/v1/notifications/unread-count', {
            token: access,
          }),
        ]);
        if (request !== sequence.current) return;
        setError(null);
        setUnreadTotal(count.count);
        const clamp = clampedPage(nextMeta, data.length);
        if (clamp != null && clamp !== pageNum) {
          goTo(clamp);
          return;
        }
        setItems(data);
        if (nextMeta) setMeta(nextMeta);
      } catch (err) {
        if (request === sequence.current)
          setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    },
    [page, filter, goTo],
  );

  useEffect(() => {
    const requests = sequence;
    const refresh = (foreground = false) => {
      const access = getAccessToken();
      setToken(access);
      if (!access) {
        sequence.current++;
        setLoading(false);
        setItems([]);
        setUnreadTotal(0);
        return;
      }
      void load(access, page, filter, foreground);
    };
    refresh(true);
    const stop = watchNotifications(refresh);
    return () => {
      stop();
      requests.current++;
    };
  }, [page, filter, load]);

  function onFilterChange(next: InboxFilter) {
    setFilter(next);
    if (page !== 1) goTo(1);
  }

  if (!token) {
    return (
      <div className={`${inboxCardClass} mt-8 p-6 sm:p-8`}>
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
        await load(token!, page);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not mark notification read',
        );
        return;
      }
    }
    const href = notificationHref(locale, n);
    if (href) router.push(href);
  }

  return (
    <div className="mt-6 min-w-0 space-y-4 sm:mt-8">
      <InboxToolbar
        locale={locale}
        filter={filter}
        onFilterChange={onFilterChange}
        unreadCount={unreadTotal}
        action={
          <button
            type="button"
            disabled={busy || unreadTotal === 0}
            aria-disabled={busy || unreadTotal === 0}
            className="text-sm font-medium text-muted transition hover:text-accent disabled:opacity-40"
            onClick={() => {
              setBusy(true);
              void apiSend('/api/v1/notifications/read-all', {
                method: 'PATCH',
                token,
              })
                .then(() => load(token, page))
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Failed'),
                )
                .finally(() => setBusy(false));
            }}
          >
            {t(locale, 'markAllRead')}
          </button>
        }
      />

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <InboxSkeleton />
      ) : items.length === 0 ? (
        <InboxEmpty
          title={
            filter === 'unread'
              ? t(locale, 'inboxNoUnread')
              : t(locale, 'noNotifications')
          }
        />
      ) : (
        <div className={inboxCardClass}>
          {items.map((n) => {
            const unread = !n.readAt;
            const href = notificationHref(locale, n);
            return (
              <button
                key={n.id}
                type="button"
                className={`flex w-full gap-3.5 border-b border-black/[0.06] px-4 py-3.5 text-left transition last:border-b-0 hover:bg-black/[0.02] focus-visible:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30 sm:px-5 ${
                  unread ? 'bg-accent/[0.04]' : 'bg-white'
                }`}
                onClick={() => void openItem(n)}
              >
                <div className="relative shrink-0 pt-0.5">
                  <NotificationTypeIcon type={n.type} />
                  {unread ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`min-w-0 truncate text-base tracking-tight sm:text-lg ${
                        unread
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground'
                      }`}
                    >
                      {n.title}
                    </p>
                    <span
                      className={`shrink-0 text-xs ${
                        unread ? 'font-semibold text-accent' : 'text-muted'
                      }`}
                    >
                      {formatNotificationWhen(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {n.message}
                  </p>
                  {href ? (
                    <span className="mt-2 inline-block text-xs font-semibold text-accent">
                      {n.dataJson?.conversationId
                        ? t(locale, 'openConversation')
                        : n.type.startsWith('dealer_')
                          ? t(locale, 'viewShowroom')
                          : t(locale, 'viewListing')}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        hasPreviousPage={meta.hasPreviousPage}
        hasNextPage={meta.hasNextPage}
        total={meta.total}
        limit={meta.limit}
        ariaLabel={t(locale, 'pagination')}
        previousLabel={t(locale, 'pagePrev')}
        nextLabel={t(locale, 'pageNext')}
        pageOfTemplate={t(locale, 'pageOf')}
        showingTemplate={t(locale, 'showingRange')}
        disabled={loading}
        onPage={goTo}
      />
    </div>
  );
}
