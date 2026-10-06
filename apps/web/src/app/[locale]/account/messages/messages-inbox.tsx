'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  InboxEmpty,
  InboxSkeleton,
  InboxToolbar,
  inboxCardClass,
  type InboxFilter,
} from '@/components/account-inbox-chrome';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useUrlPage } from '@/lib/use-url-page';
import type { PaginationMeta } from '@throttlelk/types';

type Counterpart = {
  id: string;
  displayName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

type ConversationRow = {
  id: string;
  listingTitle: string;
  listingSlug: string | null;
  lastMessageAt: string | null;
  role: 'buyer' | 'seller';
  counterpart: Counterpart | null;
  lastMessagePreview: string | null;
  lastMessageMine: boolean;
  unread?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function formatWhen(iso: string | null, locale: Locale) {
  if (!iso) return '';
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
  return date.toLocaleDateString(locale === 'si' ? 'si-LK' : 'en-LK', {
    day: 'numeric',
    month: 'short',
  });
}

function Avatar({ counterpart }: { counterpart: Counterpart | null }) {
  const name = counterpart?.fullName || counterpart?.displayName || '?';
  if (counterpart?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={counterpart.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-black/10 sm:h-12 sm:w-12"
      />
    );
  }
  return (
    <span
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground ring-1 ring-black/10 sm:h-12 sm:w-12 sm:text-base"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function MessagesInbox({ locale }: { locale: Locale }) {
  const { page, goTo } = useUrlPage();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([
      apiGetWithMeta<ConversationRow[]>('/api/v1/conversations', {
        token: access,
        searchParams: {
          page: String(page),
          limit: '20',
          ...(filter === 'unread' ? { unread: '1' } : {}),
        },
      }),
      apiGetWithMeta<ConversationRow[]>('/api/v1/conversations', {
        token: access,
        searchParams: { page: '1', limit: '1', unread: '1' },
      }),
    ])
      .then(([pageResult, unreadResult]) => {
        const { data, meta: nextMeta } = pageResult;
        const clamp = clampedPage(nextMeta, data.length);
        if (clamp != null && clamp !== page) {
          goTo(clamp);
          return;
        }
        setItems(data);
        if (nextMeta) setMeta(nextMeta);
        setUnreadTotal(unreadResult.meta?.total ?? 0);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      )
      .finally(() => setLoading(false));
  }, [page, goTo, filter]);

  function onFilterChange(next: InboxFilter) {
    setFilter(next);
    if (page !== 1) goTo(1);
  }

  if (!token) {
    return (
      <div className={`${inboxCardClass} mt-8 p-6 sm:p-8`}>
        <p className="text-sm text-muted">
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/messages`)}`}
            className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
          >
            {t(locale, 'login')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 min-w-0 space-y-4 sm:mt-8">
      <InboxToolbar
        locale={locale}
        filter={filter}
        onFilterChange={onFilterChange}
        unreadCount={unreadTotal}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <InboxSkeleton />
      ) : items.length === 0 ? (
        <InboxEmpty
          title={
            filter === 'unread'
              ? t(locale, 'inboxNoUnread')
              : t(locale, 'noMessages')
          }
          action={
            filter === 'all' ? (
              <Link
                href={`/${locale}/bikes`}
                className="inline-flex items-center justify-center rounded-md bg-[#0a0a0a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent"
              >
                {t(locale, 'browse')}
              </Link>
            ) : null
          }
        />
      ) : (
        <div className={inboxCardClass}>
          {items.map((row) => {
            const name =
              row.counterpart?.fullName ||
              row.counterpart?.displayName ||
              t(locale, 'seller');
            const unread = Boolean(row.unread);
            return (
              <Link
                key={row.id}
                href={`/${locale}/account/messages/${row.id}`}
          className={`flex min-w-0 gap-3.5 border-b border-black/[0.06] px-4 py-3.5 transition last:border-b-0 hover:bg-black/[0.02] focus-visible:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30 sm:px-5 ${
                  unread ? 'bg-accent/[0.04]' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar counterpart={row.counterpart} />
                  {unread ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`truncate text-base tracking-tight sm:text-lg ${
                          unread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground'
                        }`}
                      >
                        {name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {row.listingTitle}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`text-xs ${
                          unread ? 'font-semibold text-accent' : 'text-muted'
                        }`}
                      >
                        {formatWhen(row.lastMessageAt, locale)}
                      </span>
                      {unread ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold leading-none text-white">
                          1
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {row.lastMessagePreview ? (
                    <p
                      className={`mt-1.5 line-clamp-1 text-sm ${
                        unread
                          ? 'font-medium text-foreground'
                          : 'text-muted'
                      }`}
                    >
                      {row.lastMessageMine ? `${t(locale, 'you')}: ` : ''}
                      {row.lastMessagePreview}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] tracking-wide text-muted uppercase">
                    {row.role === 'seller'
                      ? t(locale, 'asSeller')
                      : t(locale, 'asBuyer')}
                  </p>
                </div>
              </Link>
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
