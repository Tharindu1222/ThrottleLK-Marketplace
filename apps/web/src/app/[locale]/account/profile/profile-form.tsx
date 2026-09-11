'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import {
  getAccessToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roles: string[];
  emailVerifiedAt?: string | null;
};

export function ProfileForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void apiGet<Profile>('/api/v1/users/me', { token: access })
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (!profile && !error) {
    return <p className="mt-6 text-muted">Loading…</p>;
  }

  if (!profile) {
    return <p className="mt-6 text-sm text-red-400">{error}</p>;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get('newPassword') || '');
    const currentPassword = String(form.get('currentPassword') || '');
    try {
      const updated = await apiSend<Profile>('/api/v1/users/me', {
        method: 'PATCH',
        token: token!,
        body: {
          firstName: String(form.get('firstName')),
          lastName: String(form.get('lastName')),
          phone: String(form.get('phone') || '') || null,
          ...(newPassword
            ? { currentPassword, newPassword }
            : {}),
        },
      });
      setProfile(updated);
      const stored = getStoredUser();
      if (stored) {
        const next: AuthUser = {
          ...stored,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone,
          roles: updated.roles,
        };
        saveSession({
          accessToken: token!,
          refreshToken: localStorage.getItem('throttlelk_refresh') ?? '',
          user: next,
        });
      }
      setOk('Profile saved.');
      (e.target as HTMLFormElement).querySelector<HTMLInputElement>(
        '[name=currentPassword]',
      )!.value = '';
      (e.target as HTMLFormElement).querySelector<HTMLInputElement>(
        '[name=newPassword]',
      )!.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid max-w-lg gap-3">
      <input
        name="firstName"
        required
        defaultValue={profile.firstName}
        placeholder={t(locale, 'firstName')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="lastName"
        required
        defaultValue={profile.lastName}
        placeholder={t(locale, 'lastName')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        value={profile.email}
        disabled
        className="bg-background/50 px-3 py-2 text-muted ring-1 ring-white/10"
      />
      <p className="text-sm text-muted">
        {profile.emailVerifiedAt
          ? 'Email verified'
          : 'Email not verified yet'}
        {!profile.emailVerifiedAt ? (
          <>
            {' · '}
            <button
              type="button"
              className="text-accent underline"
              onClick={() => {
                void apiSend('/api/v1/auth/resend-verification', { token })
                  .then(() => setOk('Verification email sent.'))
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : 'Resend failed',
                    ),
                  );
              }}
            >
              Resend verification
            </button>
          </>
        ) : null}
      </p>
      <input
        name="phone"
        defaultValue={profile.phone ?? ''}
        placeholder={t(locale, 'phone')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <p className="mt-4 text-sm text-muted">Change password (optional)</p>
      <input
        name="currentPassword"
        type="password"
        placeholder="Current password"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
        autoComplete="current-password"
      />
      <input
        name="newPassword"
        type="password"
        minLength={8}
        placeholder="New password"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={saving}
        className="mt-2 bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-background disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
      {ok ? <p className="text-sm text-accent">{ok}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Link
        href={`/${locale}/sellers/${profile.id}`}
        className="text-sm text-accent underline"
      >
        View public seller page
      </Link>
    </form>
  );
}
