import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { title: 'About' };
  return pageMetadata({
    title: t(locale, 'aboutTitle'),
    description: t(locale, 'aboutLead'),
    path: `/${locale}/about`,
    locale,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="break-words font-[family-name:var(--font-display)] text-3xl tracking-wide sm:text-4xl">
        {t(locale, 'aboutTitle')}
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-muted sm:text-lg">{t(locale, 'aboutLead')}</p>
      <div className="mt-8 max-w-prose space-y-4 leading-relaxed break-words text-foreground/90">
        <p>{t(locale, 'aboutBody1')}</p>
        <p>{t(locale, 'aboutBody2')}</p>
      </div>
    </main>
  );
}
