'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { apiGetWithMeta, apiSend } from '@/lib/api';
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

  async function load(access: string, pageNum = page) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<AppNotification[]>(
        '/api/v1/notifications',
        {
          token: access,
          searchParams: { page: String(pageNum), limit: '20' },
        },
      );
      const clamp = clampedPage(nextMeta, data.length);
      if (clamp != null && clamp !== pageNum) {
        goTo(clamp);
        return;
      }
      setItems(data);
      if (nextMeta) setMeta(nextMeta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setLoading(false);
      return;
    }
    void load(access, page).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.readAt).length,
    [items],
  );

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.readAt);
    return items;
  }, [filter, items]);

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
      } catch {
        /* ignore */
      }
    }
    const href = notificationHref(locale, n);
    if (href) router.push(href);
  }

  return (
    <div className="mt-6 space-y-4 sm:mt-8">
      <InboxToolbar
        locale={locale}
        filter={filter}
        onFilterChange={setFilter}
        unreadCount={unreadCount}
        action={
          <button
            type="button"
            disabled={busy || unreadCount === 0}
            aria-disabled={busy || unreadCount === 0}
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <InboxSkeleton />
      ) : visible.length === 0 ? (
        <InboxEmpty
          title={
            filter === 'unread'
              ? t(locale, 'inboxNoUnread')
              : t(locale, 'noNotifications')
          }
        />
      ) : (
        <div className={inboxCardClass}>
          {visible.map((n) => {
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

      {filter === 'all' ? (
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
      ) : null}
    </div>
  );
}
