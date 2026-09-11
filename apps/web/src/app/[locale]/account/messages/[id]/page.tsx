import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { MessageThread } from './message-thread';

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'messages')}
      </h1>
      <MessageThread locale={locale} conversationId={id} />
    </main>
  );
}
