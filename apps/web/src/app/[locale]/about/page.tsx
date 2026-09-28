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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'aboutTitle')}
      </h1>
      <p className="mt-4 text-lg text-muted">{t(locale, 'aboutLead')}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-foreground/90">
        <p>{t(locale, 'aboutBody1')}</p>
        <p>{t(locale, 'aboutBody2')}</p>
      </div>
    </main>
  );
}
