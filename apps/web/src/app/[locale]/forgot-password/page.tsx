import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { AUTH_ROBOTS, pageMetadata } from '@/lib/seo';
import { ForgotPasswordForm } from './forgot-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  return pageMetadata({
    title: 'Forgot password',
    description: 'Reset your ThrottleLK password.',
    path: `/${raw}/forgot-password`,
    locale: raw,
    robots: AUTH_ROBOTS,
  });
}

export default async function ForgotPasswordPage({
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
      title={t(locale, 'forgotPassword')}
      subtitle="We will email a reset link if the account exists."
    >
      <ForgotPasswordForm locale={locale} />
    </AuthShell>
  );
}
