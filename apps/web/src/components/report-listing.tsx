'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export function ReportListing({
  locale,
  listingId,
}: {
  locale: Locale;
  listingId: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

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
      await apiSend('/api/v1/reports', {
        token,
        body: {
          listingId,
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
              window.location.href = `/${locale}/login`;
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
          <select
            name="reason"
            required
            className="bg-background px-3 py-2 text-sm ring-1 ring-black/10"
          >
            <option value="spam">Spam</option>
            <option value="fraud">Fraud / scam</option>
            <option value="wrong_info">Wrong information</option>
            <option value="inappropriate">Inappropriate</option>
            <option value="duplicate">Duplicate</option>
            <option value="other">Other</option>
          </select>
          <textarea
            name="description"
            required
            minLength={10}
            rows={3}
            placeholder={t(locale, 'reportDetails')}
            className="bg-background px-3 py-2 text-sm ring-1 ring-black/10"
          />
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
              Cancel
            </button>
          </div>
          {!token ? (
            <p className="text-xs text-muted">
              <Link href={`/${locale}/login`} className="text-accent underline">
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
