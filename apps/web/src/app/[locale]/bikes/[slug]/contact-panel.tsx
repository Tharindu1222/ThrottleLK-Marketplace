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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    try {
      await apiSend(`/api/v1/listings/${listing.id}/contact`, {
        body: {
          buyerName: String(form.get('buyerName') ?? ''),
          buyerPhone: String(form.get('buyerPhone') ?? ''),
          buyerEmail: String(form.get('buyerEmail') || '') || undefined,
          message: String(form.get('message') ?? ''),
        },
      });
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

      {showPhone ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {listing.phone ? (
            <a
              href={`tel:${listing.phone}`}
              className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-background"
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

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          name="buyerName"
          required
          placeholder={t(locale, 'yourName')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <input
          name="buyerPhone"
          required
          placeholder={t(locale, 'phone')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <input
          name="buyerEmail"
          type="email"
          placeholder={t(locale, 'email')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <textarea
          name="message"
          required
          rows={4}
          placeholder={t(locale, 'message')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <button
          type="submit"
          className="bg-foreground px-4 py-2 font-[family-name:var(--font-display)] tracking-wide text-background"
        >
          {t(locale, 'sendMessage')}
        </button>
        {status ? <p className="text-sm text-accent">{status}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </aside>
  );
}
