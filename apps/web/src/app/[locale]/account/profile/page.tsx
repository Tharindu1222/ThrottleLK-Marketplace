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
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'accountDetails')}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
        {t(locale, 'accountDetailsHint')}
      </p>
      <div className="mt-6">
        <ProfileForm locale={locale} />
      </div>
    </div>
  );
}
