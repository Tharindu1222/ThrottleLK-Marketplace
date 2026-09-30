import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { AUTH_ROBOTS, pageMetadata } from '@/lib/seo';
import { ResetPasswordForm } from './reset-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  return pageMetadata({
    title: 'Reset password',
    description: 'Choose a new ThrottleLK password.',
    path: `/${raw}/reset-password`,
    locale: raw,
    robots: AUTH_ROBOTS,
  });
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="break-words font-[family-name:var(--font-display)] text-3xl tracking-wide sm:text-4xl">
        Reset password
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <ResetPasswordForm locale={locale} />
      </Suspense>
    </main>
  );
}
