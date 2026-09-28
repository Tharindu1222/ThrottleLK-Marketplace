'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { loginHref } from '@/lib/login-href';

export function ReportListing({
  locale,
  listingId,
  partListingId,
}: {
  locale: Locale;
  listingId?: string;
  partListingId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextPath =
    typeof window === 'undefined'
      ? `/${locale}`
      : `${window.location.pathname}${window.location.search}`;
  const signInHref = loginHref(locale, nextPath);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      window.location.href = signInHref;
      return;
    }
    setError(null);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    try {
      await apiSend('/api/v1/reports', {
        token,
        body: {
          ...(listingId ? { listingId } : {}),
          ...(partListingId ? { partListingId } : {}),
          reason: String(form.get('reason')),
          description: String(form.get('description')),
        },
      });
      setStatus(t(locale, 'reportSent'));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="mt-8 border-t border-black/10 pt-6">
      {!open ? (
        <button
          type="button"
          className="text-sm text-muted underline hover:text-foreground"
          onClick={() => {
            if (!token) {
              window.location.href = signInHref;
              return;
            }
            setOpen(true);
          }}
        >
          {t(locale, 'reportListing')}
        </button>
      ) : (
        <form onSubmit={onSubmit} className="grid max-w-md gap-3">
          <p className="text-sm text-muted">{t(locale, 'reportListing')}</p>
          <label className="grid gap-1 text-sm">
            <span>{t(locale, 'reportReasonLabel')}</span>
            <select
              name="reason"
              required
              className="bg-background px-3 py-2 text-sm ring-1 ring-black/10"
            >
              <option value="spam">{t(locale, 'reportReasonSpam')}</option>
              <option value="fraud">{t(locale, 'reportReasonFraud')}</option>
              <option value="wrong_info">{t(locale, 'reportReasonWrong')}</option>
              <option value="inappropriate">
                {t(locale, 'reportReasonInappropriate')}
              </option>
              <option value="duplicate">{t(locale, 'reportReasonDuplicate')}</option>
              <option value="other">{t(locale, 'reportReasonOther')}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t(locale, 'reportDetails')}</span>
            <textarea
              name="description"
              required
              minLength={10}
              rows={3}
              placeholder={t(locale, 'reportDetails')}
              className="bg-background px-3 py-2 text-sm ring-1 ring-black/10"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-foreground px-3 py-1.5 text-sm text-background"
            >
              {t(locale, 'submitReport')}
            </button>
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => setOpen(false)}
            >
              {t(locale, 'cancel')}
            </button>
          </div>
          {!token ? (
            <p className="text-xs text-muted">
              <Link href={signInHref} className="text-accent underline">
                {t(locale, 'login')}
              </Link>{' '}
              required
            </p>
          ) : null}
        </form>
      )}
      {status ? <p className="mt-2 text-sm text-accent">{status}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
