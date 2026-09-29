import { notFound } from 'next/navigation';
import { ShowroomSwitchNav } from '@/components/showroom-switch-nav';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { PartsShowroomClient } from './parts-showroom-client';

export default async function PartsShowroomPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'accountPartsShowroomEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'partsShowroom')}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        {t(locale, 'partsShowroomHint')}
      </p>
      <ShowroomSwitchNav locale={locale} />
      <div className="mt-8">
        <PartsShowroomClient locale={locale} />
      </div>
    </div>
  );
}
