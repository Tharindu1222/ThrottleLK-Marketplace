'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type ListingContact = {
  id: string;
  phone: string | null;
  whatsapp: string | null;
  contactHidden?: boolean;
  seller?: { id: string; displayName: string } | null;
};

export function ContactPanel({
  locale,
  listing: initial,
}: {
  locale: Locale;
  listing: ListingContact;
}) {
  const [listing, setListing] = useState(initial);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void apiGet<ListingContact>(`/api/v1/listings/${initial.id}`, {
      token: access,
    })
      .then(setListing)
      .catch(() => undefined);
  }, [initial.id]);

  const showPhone = Boolean(token) && listing.contactHidden === false;
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
    <aside className="border border-white/10 bg-surface/50 p-5">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        {t(locale, 'contactSeller')}
      </h2>

      {seller ? (
        <p className="mt-3 text-sm">
          <span className="text-muted">{t(locale, 'seller')}: </span>
          <Link
            href={`/${locale}/sellers/${seller.id}`}
            className="text-accent underline"
          >
            {seller.displayName}
          </Link>
        </p>
      ) : null}

      {showPhone ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {listing.phone ? (
            <a
              href={`tel:${listing.phone}`}
              className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-white"
            >
              {t(locale, 'call')}: {listing.phone}
            </a>
          ) : null}
          {(listing.whatsapp || listing.phone) && (
            <a
              href={`https://wa.me/94${(listing.whatsapp || listing.phone || '').replace(/\D/g, '').replace(/^0/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="border border-accent px-4 py-2 text-accent"
            >
              {t(locale, 'whatsapp')}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {t(locale, 'phoneHidden')}{' '}
          <Link href={`/${locale}/login`} className="text-accent underline">
            {t(locale, 'login')}
          </Link>
        </p>
      )}

      {token ? (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <p className="text-sm text-muted">{t(locale, 'messageSellerHint')}</p>
          <textarea
            name="message"
            required
            rows={4}
            minLength={1}
            placeholder={t(locale, 'message')}
            className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
          />
          <button
            type="submit"
            className="bg-foreground px-4 py-2 font-[family-name:var(--font-display)] tracking-wide text-background"
          >
            {t(locale, 'sendMessage')}
          </button>
          {conversationId ? (
            <Link
              href={`/${locale}/account/messages/${conversationId}`}
              className="text-sm text-accent underline"
            >
              {t(locale, 'openConversation')}
            </Link>
          ) : null}
          {status ? <p className="text-sm text-accent">{status}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          {t(locale, 'loginToMessage')}{' '}
          <Link href={`/${locale}/login`} className="text-accent underline">
            {t(locale, 'login')}
          </Link>
        </p>
      )}
    </aside>
  );
}
