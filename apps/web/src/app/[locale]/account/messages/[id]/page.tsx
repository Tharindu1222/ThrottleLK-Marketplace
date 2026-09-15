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
    <div>
      <h1 className="sr-only">{t(locale, 'messages')}</h1>
      <MessageThread locale={locale} conversationId={id} />
    </div>
  );
}
