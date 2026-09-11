import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { ForgotPasswordForm } from './forgot-password-form';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Forgot password
      </h1>
      <p className="mt-2 text-muted">
        We will email a reset link if the account exists.
      </p>
      <ForgotPasswordForm locale={locale} />
    </main>
  );
}
