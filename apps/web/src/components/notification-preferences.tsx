'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences as Preferences,
} from '@throttlelk/types';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

const fields: Array<[keyof Preferences, string]> = [
  ['email', 'notificationEmail'],
  ['inApp', 'notificationInApp'],
  ['messages', 'notificationMessages'],
  ['listings', 'notificationListings'],
  ['shops', 'notificationShops'],
  ['promotions', 'notificationPromotions'],
  ['savedSearches', 'notificationSaved'],
];

export function NotificationPreferences({ locale }: { locale: Locale }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadedUser: string | null = null;
    let pendingUser: string | null = null;
    let generation = 0;
    const load = () => {
      const token = getAccessToken();
      const user = getStoredUser();
      setAuthenticated(Boolean(token && user));
      if (!token || !user) {
        generation++;
        loadedUser = null;
        pendingUser = null;
        setPreferences(null);
        setError(null);
        return;
      }
      if (loadedUser === user.id || pendingUser === user.id) return;
      const request = ++generation;
      pendingUser = user.id;
      setPreferences(null);
      void apiGet<Preferences>('/api/v1/notifications/preferences', { token })
        .then((data) => {
          if (mounted && request === generation) {
            loadedUser = user.id;
            setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...data });
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted && request === generation)
            setError(err instanceof Error ? err.message : 'Failed');
        })
        .finally(() => {
          if (request === generation) pendingUser = null;
        });
    };
    load();
    window.addEventListener('throttlelk-session', load);
    return () => {
      mounted = false;
      window.removeEventListener('throttlelk-session', load);
    };
  }, [retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const token = getAccessToken();
    if (!preferences || !token) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      setPreferences(
        await apiSend<Preferences>('/api/v1/notifications/preferences', {
          method: 'PATCH',
          token,
          body: preferences,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (authenticated === false) return null;

  return (
    <section
      className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-black/[0.06] sm:p-5"
      aria-labelledby="notification-preferences-title"
    >
      <h2
        id="notification-preferences-title"
        className="text-lg font-bold text-foreground"
      >
        {t(locale, 'notificationPreferences')}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {t(locale, 'notificationPreferencesHint')}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {!preferences ? (
        error ? (
          <button
            type="button"
            className="mt-3 min-h-11 text-sm text-accent underline"
            onClick={() => {
              setError(null);
              setRetry((value) => value + 1);
            }}
          >
            {t(locale, 'tryAgain')}
          </button>
        ) : (
          <p className="mt-4 text-sm text-muted">{t(locale, 'loading')}</p>
        )
      ) : (
        <form onSubmit={(event) => void save(event)} className="mt-4 space-y-4">
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">
              {t(locale, 'notificationPreferences')}
            </legend>
            {fields.map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) => {
                    setPreferences({
                      ...preferences,
                      [key]: event.target.checked,
                    });
                    setSaved(false);
                  }}
                  className="h-4 w-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                {t(locale, label)}
              </label>
            ))}
          </fieldset>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t(locale, busy ? 'saving' : 'savePreferences')}
          </button>
          {saved ? (
            <p role="status" className="text-sm text-emerald-700">
              {t(locale, 'preferencesSaved')}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
