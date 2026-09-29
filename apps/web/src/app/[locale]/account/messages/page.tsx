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
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'accountMessagesEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'messages')}
      </h1>
      <Suspense
        fallback={
          <div className="mt-8">
            <div className="h-8 w-40 animate-pulse rounded-md bg-black/[0.06]" />
            <div className="mt-4 space-y-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]">
              <div className="h-16 animate-pulse border-b border-black/[0.06] bg-black/[0.03]" />
              <div className="h-16 animate-pulse border-b border-black/[0.06] bg-black/[0.03]" />
              <div className="h-16 animate-pulse bg-black/[0.03]" />
            </div>
          </div>
        }
      >
        <MessagesInbox locale={locale} />
      </Suspense>
    </div>
  );
}
