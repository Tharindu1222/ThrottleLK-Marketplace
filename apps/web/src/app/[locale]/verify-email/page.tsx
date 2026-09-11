import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { VerifyEmailClient } from './verify-email-client';

export default async function VerifyEmailPage({
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
        Verify email
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <VerifyEmailClient locale={locale} />
      </Suspense>
    </main>
  );
}
