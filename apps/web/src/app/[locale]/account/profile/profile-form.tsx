'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
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
  avatarUrl?: string | null;
  roles: string[];
  emailVerifiedAt?: string | null;
};

const fieldClass =
  'w-full rounded-full border border-black/10 bg-surface/90 px-5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

const cardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function AvatarBubble({
  profile,
  size = 'md',
}: {
  profile: Profile;
  size?: 'md' | 'lg' | 'xl';
}) {
  const dim =
    size === 'xl'
      ? 'h-24 w-24 text-2xl sm:h-28 sm:w-28'
      : size === 'lg'
        ? 'h-20 w-20 text-xl'
        : 'h-14 w-14 text-lg';
  if (profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-black/10`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-surface font-[family-name:var(--font-display)] tracking-wide text-foreground ring-1 ring-black/10`}
      aria-hidden
    >
      {initials(profile.firstName, profile.lastName)}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-black/10 py-4 last:border-b-0 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
      <dt className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="text-sm text-foreground sm:text-base">{value}</dd>
    </div>
  );
}

export function ProfileForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function syncStoredUser(updated: Profile) {
    const stored = getStoredUser();
    if (!stored || !token) return;
    const next: AuthUser = {
      ...stored,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      roles: updated.roles,
      avatarUrl: updated.avatarUrl ?? null,
    };
    saveSession({
      accessToken: token,
      refreshToken: localStorage.getItem('throttlelk_refresh') ?? '',
      user: next,
    });
  }

  if (!token) {
    return (
      <p className="text-muted">
        <Link
          href={`/${locale}/login`}
          className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (!profile && !error) {
    return (
      <div className={`${cardClass} p-8 text-sm text-muted`}>Loading…</div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  async function onAvatarSelected(file: File | null) {
    if (!file || !token) return;
    setAvatarBusy(true);
    setError(null);
    setOk(null);
    try {
      const updated = await apiUpload<Profile>(
        '/api/v1/users/me/avatar',
        file,
        token,
      );
      setProfile(updated);
      syncStoredUser(updated);
      setOk(t(locale, 'avatarUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onRemoveAvatar() {
    if (!token) return;
    setAvatarBusy(true);
    setError(null);
    setOk(null);
    try {
      const updated = await apiSend<Profile>('/api/v1/users/me/avatar', {
        method: 'DELETE',
        token,
      });
      setProfile(updated);
      syncStoredUser(updated);
      setOk(t(locale, 'avatarRemoved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setAvatarBusy(false);
    }
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
          ...(newPassword ? { currentPassword, newPassword } : {}),
        },
      });
      setProfile(updated);
      syncStoredUser(updated);
      setOk('Profile saved.');
      setEditing(false);
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

  if (!editing) {
    return (
      <article className={cardClass}>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <AvatarBubble profile={profile} size="xl" />
            <div className="min-w-0">
              <h2 className="truncate font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
                {profile.firstName} {profile.lastName}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {profile.emailVerifiedAt ? (
                  <span className="inline-flex border border-emerald-600/20 bg-emerald-50 px-2.5 py-1 text-[11px] tracking-wide text-emerald-800 uppercase">
                    Email verified
                  </span>
                ) : (
                  <span className="inline-flex border border-amber-600/20 bg-amber-50 px-2.5 py-1 text-[11px] tracking-wide text-amber-900 uppercase">
                    Email not verified
                  </span>
                )}
              </div>
              {!profile.emailVerifiedAt ? (
                <button
                  type="button"
                  className="mt-3 text-sm text-muted underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
                  onClick={() => {
                    void apiSend('/api/v1/auth/resend-verification', {
                      token,
                    })
                      .then(() => setOk('Verification email sent.'))
                      .catch((err) =>
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Resend failed',
                        ),
                      );
                  }}
                >
                  Resend verification
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
            onClick={() => {
              setOk(null);
              setError(null);
              setEditing(true);
            }}
          >
            {t(locale, 'editListing')}
          </button>
        </div>

        <dl className="border-t border-black/10 px-6 sm:px-8">
          <InfoRow label={t(locale, 'email')} value={profile.email} />
          <InfoRow label={t(locale, 'phone')} value={profile.phone || '—'} />
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-6 py-4 sm:px-8">
          <Link
            href={`/${locale}/sellers/${profile.id}`}
            className="text-sm text-muted transition hover:text-accent"
          >
            View public seller page
          </Link>
          {ok ? <p className="text-sm text-foreground">{ok}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </article>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cardClass}>
      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-5 border border-black/10 bg-surface/50 p-5 sm:flex-row sm:items-center">
          <AvatarBubble profile={profile} size="lg" />
          <div className="space-y-2">
            <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground">
              {t(locale, 'profilePhoto')}
            </p>
            <p className="text-xs text-muted">JPEG, PNG, or WebP · max 5MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) =>
                void onAvatarSelected(e.target.files?.[0] ?? null)
              }
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={avatarBusy}
                className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-foreground transition hover:border-accent hover:text-accent disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
              >
                {avatarBusy
                  ? '…'
                  : profile.avatarUrl
                    ? t(locale, 'changePhoto')
                    : t(locale, 'uploadPhoto')}
              </button>
              {profile.avatarUrl ? (
                <button
                  type="button"
                  disabled={avatarBusy}
                  className="inline-flex items-center justify-center rounded-full border border-black/15 px-4 py-2 text-sm text-muted transition hover:border-black/30 hover:text-foreground disabled:opacity-50"
                  onClick={() => void onRemoveAvatar()}
                >
                  {t(locale, 'removePhoto')}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'firstName')}
            </span>
            <input
              name="firstName"
              required
              defaultValue={profile.firstName}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'lastName')}
            </span>
            <input
              name="lastName"
              required
              defaultValue={profile.lastName}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'email')}
          </span>
          <input
            value={profile.email}
            disabled
            className="w-full rounded-full border border-black/10 bg-surface px-5 py-3 text-sm text-muted"
          />
          <span className="text-xs text-muted">
            {profile.emailVerifiedAt
              ? 'Email verified'
              : 'Email not verified yet'}
            {!profile.emailVerifiedAt ? (
              <>
                {' · '}
                <button
                  type="button"
                  className="underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
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
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'phone')}
          </span>
          <input
            name="phone"
            defaultValue={profile.phone ?? ''}
            className={fieldClass}
          />
        </label>

        <div className="border border-black/10 bg-surface/50 p-4 sm:p-5">
          <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground">
            Change password
          </p>
          <p className="mt-1 text-xs text-muted">
            Optional — leave blank to keep current
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="currentPassword"
              type="password"
              placeholder="Current password"
              className={fieldClass}
              autoComplete="current-password"
            />
            <input
              name="newPassword"
              type="password"
              minLength={8}
              placeholder="New password"
              className={fieldClass}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? 'Saving…' : t(locale, 'saveProfile')}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-black/15 px-6 py-3 text-sm text-foreground transition hover:border-black/30"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
          >
            {t(locale, 'cancelEdit')}
          </button>
        </div>
        {ok ? <p className="text-sm text-foreground">{ok}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Link
          href={`/${locale}/sellers/${profile.id}`}
          className="inline-block text-sm text-muted transition hover:text-accent"
        >
          View public seller page
        </Link>
      </div>
    </form>
  );
}
