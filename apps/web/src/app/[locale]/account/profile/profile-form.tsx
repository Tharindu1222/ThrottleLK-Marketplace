'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import {
  getAccessToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { sellerProfileHref } from '@/lib/seller-href';

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
  'w-full bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-black/10 transition focus:ring-2 focus:ring-accent/35 disabled:bg-[#f4f5f7] disabled:text-muted';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function AvatarBubble({
  profile,
  size = 'lg',
}: {
  profile: Profile;
  size?: 'lg' | 'xl';
}) {
  const dim =
    size === 'xl'
      ? 'h-28 w-28 text-2xl sm:h-32 sm:w-32'
      : 'h-20 w-20 text-xl';
  if (profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-4 ring-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[#f4f5f7] font-[family-name:var(--font-display)] tracking-wide text-foreground ring-4 ring-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]`}
      aria-hidden
    >
      {initials(profile.firstName, profile.lastName)}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)] ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
          {title}
        </h2>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  icon,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f4f5f7] text-foreground/70">
          {icon}
        </span>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
  extra,
  className = '',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 border-b border-black/[0.06] py-3.5 last:border-b-0 last:pb-0 first:pt-0 ${className}`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f5f7] text-foreground/70">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm text-foreground sm:text-[15px]">
          {value}
        </p>
        {extra}
      </div>
    </div>
  );
}

export function ProfileForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dealerSlug, setDealerSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<Profile>('/api/v1/users/me', { token: access }),
      apiGet<{ slug: string; status: string }[]>('/api/v1/dealers/mine', {
        token: access,
      }).catch(() => [] as { slug: string; status: string }[]),
    ])
      .then(([me, shops]) => {
        setProfile(me);
        setDealerSlug(
          shops.find((shop) => shop.status === 'active')?.slug ?? null,
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  useEffect(() => {
    if (editing) firstNameRef.current?.focus();
  }, [editing]);

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

  function startEditing() {
    setOk(null);
    setError(null);
    // Defer so the Edit click cannot land on the Save submit that replaces it.
    window.setTimeout(() => setEditing(true), 0);
  }

  async function resendVerification() {
    if (!token) return;
    setResending(true);
    setError(null);
    setOk(null);
    try {
      await apiSend('/api/v1/auth/resend-verification', { token });
      setOk(t(locale, 'verificationSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setResending(false);
    }
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
      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]" aria-busy="true">
        <div className="h-72 animate-pulse rounded-xl bg-black/[0.06]" />
        <div className="space-y-5">
          <div className="h-44 animate-pulse rounded-xl bg-black/[0.06]" />
          <div className="h-36 animate-pulse rounded-xl bg-black/[0.06]" />
        </div>
        <span className="sr-only">{t(locale, 'loadingProfile')}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error}
      </p>
    );
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
    if (!editing) return;
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get('newPassword') || '');
    const currentPassword = String(form.get('currentPassword') || '');
    if (newPassword && !currentPassword) {
      setError(t(locale, 'currentPasswordRequired'));
      return;
    }
    setSaving(true);
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
      setOk(t(locale, 'profileSaved'));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const sellerType = profile.roles.includes('dealer')
    ? t(locale, 'sellerDealer')
    : t(locale, 'sellerPrivate');
  const publicHref = sellerProfileHref(locale, {
    id: profile.id,
    dealerSlug,
  });
  const verified = Boolean(profile.emailVerifiedAt);

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void onAvatarSelected(e.target.files?.[0] ?? null)}
      />

      <aside className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)] xl:sticky xl:top-0">
        <div className="h-16 bg-gradient-to-br from-[#eceef1] via-[#f7f8f9] to-accent/10" />
        <div className="-mt-10 flex flex-col items-center px-5 pb-6 text-center">
          <div className="relative">
            <AvatarBubble profile={profile} size="xl" />
            <button
              type="button"
              disabled={avatarBusy}
              className="absolute right-0.5 bottom-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
              aria-label={
                profile.avatarUrl
                  ? t(locale, 'changePhoto')
                  : t(locale, 'uploadPhoto')
              }
              onClick={() => {
                if (!editing) startEditing();
                fileRef.current?.click();
              }}
            >
              <Icon>
                <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
                <circle cx="12" cy="13" r="3.25" />
              </Icon>
            </button>
          </div>
          <h2 className="mt-4 max-w-full truncate font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
            {fullName}
          </h2>
          <p className="mt-1 text-sm text-muted">{sellerType}</p>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
              verified
                ? 'bg-emerald-700 text-white'
                : 'bg-amber-400 text-zinc-950'
            }`}
          >
            <Icon>
              {verified ? (
                <path d="M5 12l5 5L20 7" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </>
              )}
            </Icon>
            {verified
              ? t(locale, 'emailVerified')
              : t(locale, 'emailNotVerified')}
          </span>

          {editing && profile.avatarUrl ? (
            <button
              type="button"
              disabled={avatarBusy}
              className="mt-3 text-sm text-muted underline decoration-black/20 underline-offset-2 transition hover:text-foreground"
              onClick={() => void onRemoveAvatar()}
            >
              {t(locale, 'removePhoto')}
            </button>
          ) : null}
          {editing ? (
            <p className="mt-2 text-xs text-muted">{t(locale, 'photoHint')}</p>
          ) : null}

          <div className="mt-5 flex w-full flex-col gap-2">
            {editing ? (
              <button
                type="button"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm text-muted transition hover:text-foreground"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                {t(locale, 'cancelEdit')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110"
                  onClick={startEditing}
                >
                  <Icon>
                    <path d="M4 20h4l10.5-10.5-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </Icon>
                  {t(locale, 'editProfile')}
                </button>
                <Link
                  href={publicHref}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-muted transition hover:text-accent"
                >
                  <Icon>
                    <path d="M14 4h6v6" />
                    <path d="M10 14L20 4" />
                    <path d="M20 14v6H4V4h6" />
                  </Icon>
                  {t(locale, 'viewPublicProfile')}
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        {ok ? (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-950"
            role="status"
          >
            {ok}
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {!verified ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 text-sm text-amber-950">
              <span className="mt-0.5 text-amber-700">
                <Icon>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </Icon>
              </span>
              <div>
                <p className="font-medium">{t(locale, 'emailNotVerified')}</p>
                <p className="mt-0.5 text-amber-900/80">
                  {t(locale, 'emailNotVerifiedHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={resending}
              className="inline-flex shrink-0 items-center justify-center bg-white px-4 py-2.5 text-sm font-medium text-amber-950 ring-1 ring-amber-900/15 transition hover:bg-amber-100 disabled:opacity-60"
              onClick={() => void resendVerification()}
            >
              {resending ? t(locale, 'sending') : t(locale, 'resendVerification')}
            </button>
          </div>
        ) : null}

        {editing ? (
          <Section
            title={t(locale, 'profile')}
            icon={
              <Icon>
                <circle cx="12" cy="8" r="3.25" />
                <path d="M5.5 19.25c1.6-3.1 4-4.75 6.5-4.75s4.9 1.65 6.5 4.75" />
              </Icon>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t(locale, 'firstName')}
                htmlFor={`${uid}-first`}
                icon={
                  <Icon>
                    <circle cx="12" cy="8" r="3.25" />
                    <path d="M5.5 19.25c1.6-3.1 4-4.75 6.5-4.75s4.9 1.65 6.5 4.75" />
                  </Icon>
                }
              >
                <input
                  ref={firstNameRef}
                  id={`${uid}-first`}
                  name="firstName"
                  required
                  autoComplete="given-name"
                  defaultValue={profile.firstName}
                  className={fieldClass}
                />
              </Field>
              <Field
                label={t(locale, 'lastName')}
                htmlFor={`${uid}-last`}
                icon={
                  <Icon>
                    <circle cx="12" cy="8" r="3.25" />
                    <path d="M5.5 19.25c1.6-3.1 4-4.75 6.5-4.75s4.9 1.65 6.5 4.75" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-last`}
                  name="lastName"
                  required
                  autoComplete="family-name"
                  defaultValue={profile.lastName}
                  className={fieldClass}
                />
              </Field>
            </div>
          </Section>
        ) : null}

        <Section
          title={t(locale, 'contactSection')}
          icon={
            <Icon>
              <path d="M4 6h16v12H4z" />
              <path d="M4 7l8 6 8-6" />
            </Icon>
          }
        >
          {editing ? (
            <div className="grid gap-4">
              <Field
                label={t(locale, 'email')}
                htmlFor={`${uid}-email`}
                hint={
                  verified
                    ? t(locale, 'emailVerified')
                    : t(locale, 'emailNotVerified')
                }
                icon={
                  <Icon>
                    <path d="M4 6h16v12H4z" />
                    <path d="M4 7l8 6 8-6" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-email`}
                  value={profile.email}
                  disabled
                  className={fieldClass}
                />
              </Field>
              <Field
                label={t(locale, 'phone')}
                htmlFor={`${uid}-phone`}
                icon={
                  <Icon>
                    <path d="M7 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 7a2 2 0 0 1 2-2z" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={profile.phone ?? ''}
                  className={fieldClass}
                />
              </Field>
            </div>
          ) : (
            <>
              <DetailRow
                label={t(locale, 'email')}
                value={profile.email}
                icon={
                  <Icon>
                    <path d="M4 6h16v12H4z" />
                    <path d="M4 7l8 6 8-6" />
                  </Icon>
                }
              />
              <DetailRow
                label={t(locale, 'phone')}
                value={profile.phone || t(locale, 'phoneNotAdded')}
                icon={
                  <Icon>
                    <path d="M7 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 7a2 2 0 0 1 2-2z" />
                  </Icon>
                }
              />
            </>
          )}
        </Section>

        <Section
          title={t(locale, 'securitySection')}
          icon={
            <Icon>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Icon>
          }
        >
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t(locale, 'currentPassword')}
                htmlFor={`${uid}-current`}
                hint={t(locale, 'changePasswordHint')}
                icon={
                  <Icon>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-current`}
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className={fieldClass}
                />
              </Field>
              <Field
                label={t(locale, 'newPassword')}
                htmlFor={`${uid}-new`}
                icon={
                  <Icon>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    <path d="M12 15v2" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-new`}
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DetailRow
                className="min-w-0 flex-1 border-none py-0"
                label={t(locale, 'password')}
                value={t(locale, 'passwordMasked')}
                icon={
                  <Icon>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </Icon>
                }
              />
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center px-3 py-2 text-sm text-accent transition hover:brightness-110"
                onClick={startEditing}
              >
                {t(locale, 'changePassword')}
              </button>
            </div>
          )}
        </Section>

        {editing ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm text-muted transition hover:text-foreground"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {t(locale, 'cancelEdit')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110 disabled:opacity-60 sm:min-w-[12rem]"
            >
              <Icon>
                <path d="M5 12l5 5L20 7" />
              </Icon>
              {saving ? t(locale, 'saving') : t(locale, 'saveProfile')}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
