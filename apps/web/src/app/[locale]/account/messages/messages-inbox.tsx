'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

const cardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

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

function Avatar({
  counterpart,
}: {
  counterpart: Counterpart | null;
}) {
  const name = counterpart?.fullName || counterpart?.displayName || '?';
  if (counterpart?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={counterpart.avatarUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-black/10"
      />
    );
  }
  return (
    <span
      className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground ring-1 ring-black/10"
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    setLoading(true);
    void apiGetWithMeta<ConversationRow[]>('/api/v1/conversations', {
      token: access,
      searchParams: { page: String(page), limit: '20' },
    })
      .then(({ data, meta: nextMeta }) => {
        const clamp = clampedPage(nextMeta, data.length);
        if (clamp != null && clamp !== page) {
          goTo(clamp);
          return;
        }
        setItems(data);
        if (nextMeta) setMeta(nextMeta);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      )
      .finally(() => setLoading(false));
  }, [page, goTo]);

  if (!token) {
    return (
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
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
    <div className="mt-8">
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-60' : undefined}>
      {items.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-muted">{t(locale, 'noMessages')}</p>
          <Link
            href={`/${locale}/bikes`}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110"
          >
            {t(locale, 'browse')}
          </Link>
        </div>
      ) : (
        <div className={cardClass}>
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
                className={`flex gap-4 border-b border-black/10 px-4 py-4 transition last:border-b-0 hover:bg-surface/60 sm:px-5 ${
                  unread ? 'bg-accent/[0.04]' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar counterpart={row.counterpart} />
                  {unread ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`truncate font-[family-name:var(--font-display)] text-lg tracking-wide ${
                          unread
                            ? 'font-semibold text-foreground'
                            : 'text-foreground'
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
                  {row.counterpart?.phone ? (
                    <p className="mt-1.5 text-sm text-foreground/80">
                      {row.counterpart.phone}
                    </p>
                  ) : null}
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
      </div>
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
