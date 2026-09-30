import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guides } from '@/content/guides';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: isLocale(locale) ? t(locale, 'guidesTitle') : 'Guides',
    description: isLocale(locale)
      ? t(locale, 'guidesLead')
      : 'Practical guides for buying and selling motorcycles in Sri Lanka.',
    path: `/${locale}/guides`,
    locale,
  });
}

export default async function GuidesIndexPage({
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
        {t(locale, 'guidesTitle')}
      </h1>
      <p className="mt-2 max-w-2xl text-muted">{t(locale, 'guidesLead')}</p>
      <div className="mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/${locale}/guides/${guide.slug}`}
            className="border border-black/10 bg-surface/40 p-5 hover:border-accent/40"
          >
            <p className="text-xs tracking-wide text-muted uppercase">
              {guide.publishedAt}
            </p>
            <h2 className="mt-2 break-words font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {locale === 'si' ? guide.titleSi : guide.title}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {locale === 'si' ? guide.descriptionSi : guide.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
