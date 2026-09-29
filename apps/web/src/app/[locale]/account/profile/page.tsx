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
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'accountProfileEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'accountDetails')}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        {t(locale, 'accountDetailsHint')}
      </p>
      <div className="mt-8">
        <ProfileForm locale={locale} />
      </div>
    </div>
  );
}
