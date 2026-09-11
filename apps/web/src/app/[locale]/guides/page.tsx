import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guides } from '@/content/guides';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: 'Motorcycle buying guides for Sri Lanka',
    description:
      'Practical guides for buying and selling motorcycles and scooters in Sri Lanka.',
    path: `/${locale}/guides`,
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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Guides
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Practical advice for Sri Lankan riders — buying, selling, and choosing
        the right bike.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/${locale}/guides/${guide.slug}`}
            className="border border-white/10 bg-surface/40 p-5 hover:border-accent/40"
          >
            <p className="text-xs tracking-wide text-muted uppercase">
              {guide.publishedAt}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {guide.title}
            </h2>
            <p className="mt-3 text-sm text-muted">{guide.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
