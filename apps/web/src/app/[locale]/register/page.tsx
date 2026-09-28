import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { AUTH_ROBOTS, pageMetadata } from '@/lib/seo';
import { RegisterForm } from './register-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  return pageMetadata({
    title: 'Create account',
    description: 'Register on ThrottleLK.',
    path: `/${raw}/register`,
    locale: raw,
    robots: AUTH_ROBOTS,
  });
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <AuthShell
      locale={locale}
      title={t(locale, 'welcome')}
      subtitle={t(locale, 'createYourAccount')}
    >
      <RegisterForm locale={locale} />
    </AuthShell>
  );
}
