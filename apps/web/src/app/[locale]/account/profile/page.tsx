import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { ProfileForm } from './profile-form';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="relative isolate min-h-[70vh]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_16%,transparent)_0%,transparent_70%)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-12 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.35em] text-accent uppercase">
          {t(locale, 'profile')}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
          {t(locale, 'accountDetails')}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
          {t(locale, 'accountDetailsHint')}
        </p>
        <div className="mt-8">
          <ProfileForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
