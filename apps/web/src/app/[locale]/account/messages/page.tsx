import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { MessagesInbox } from './messages-inbox';

export default async function MessagesPage({
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
        {t(locale, 'messages')}
      </h1>
      <Suspense fallback={<div className="mt-8"><div className="h-8 w-40 animate-pulse rounded bg-black/[0.06]" /><div className="mt-4 space-y-0 overflow-hidden border border-black/10 bg-white"><div className="h-16 animate-pulse border-b border-black/10 bg-black/[0.03]" /><div className="h-16 animate-pulse border-b border-black/10 bg-black/[0.03]" /><div className="h-16 animate-pulse bg-black/[0.03]" /></div></div>}>
        <MessagesInbox locale={locale} />
      </Suspense>
    </div>
  );
}
