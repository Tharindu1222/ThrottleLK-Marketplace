'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type ListingContact = {
  id: string;
  phone: string | null;
  whatsapp: string | null;
  contactHidden?: boolean;
  seller?: { id: string; displayName: string } | null;
};

function sellerInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function ContactPanel({
  locale,
  listing: initial,
}: {
  locale: Locale;
  listing: ListingContact;
}) {
  const [listing] = useState(initial);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const hasPhone = Boolean(listing.phone || listing.whatsapp);
  const seller = listing.seller ?? initial.seller;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    setError(null);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    try {
      const result = await apiSend<{
        conversationId: string;
      }>(`/api/v1/conversations`, {
        token,
        body: {
          listingId: listing.id,
          message: String(form.get('message') ?? ''),
        },
      });
      setConversationId(result.conversationId);
      setStatus(t(locale, 'inquirySent'));
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <aside className="border border-black/12 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.28)] sm:p-7">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
        {t(locale, 'contactSeller')}
      </h2>

      {seller ? (
        <div className="mt-5 flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 font-[family-name:var(--font-display)] text-lg text-accent"
          >
            {sellerInitial(seller.displayName)}
          </span>
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-muted uppercase">
              {t(locale, 'seller')}
            </p>
            <Link
              href={`/${locale}/sellers/${seller.id}`}
              className="truncate font-medium text-foreground transition hover:text-accent hover:underline"
            >
              {seller.displayName}
            </Link>
          </div>
        </div>
      ) : null}

      {hasPhone ? (
        <div className="mt-5 flex flex-col gap-2.5">
          {listing.phone ? (
            <a
              href={`tel:${listing.phone}`}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110"
            >
              {t(locale, 'call')}: {listing.phone}
            </a>
          ) : null}
          {(listing.whatsapp || listing.phone) && (
            <a
              href={`https://wa.me/94${(listing.whatsapp || listing.phone || '').replace(/\D/g, '').replace(/^0/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-accent px-5 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-accent transition hover:bg-accent/5"
            >
              {t(locale, 'whatsapp')}
            </a>
          )}
        </div>
      ) : null}

      <div className="mt-6 border-t border-black/10 pt-6">
        {token ? (
          <form onSubmit={onSubmit} className="grid gap-3">
            <p className="text-sm text-muted">{t(locale, 'messageSellerHint')}</p>
            <textarea
              name="message"
              required
              rows={4}
              minLength={1}
              placeholder={t(locale, 'message')}
              className="w-full resize-y border border-black/10 bg-surface/80 px-4 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110"
            >
              {t(locale, 'sendMessage')}
            </button>
            {conversationId ? (
              <Link
                href={`/${locale}/account/messages/${conversationId}`}
                className="text-center text-sm font-medium text-accent hover:underline"
              >
                {t(locale, 'openConversation')}
              </Link>
            ) : null}
            {status ? <p className="text-sm text-accent">{status}</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t(locale, 'loginToMessage')}</p>
            <Link
              href={`/${locale}/login`}
              className="inline-flex w-full items-center justify-center rounded-full border border-black/15 px-5 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
            >
              {t(locale, 'login')}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
