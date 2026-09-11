import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGuide, guides } from '@/content/guides';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide not found' };
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/${locale}/guides/${slug}`,
  });
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-muted">
        <Link href={`/${locale}/guides`} className="hover:text-accent">
          Guides
        </Link>{' '}
        · {guide.publishedAt}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
        {guide.title}
      </h1>
      <p className="mt-4 text-lg text-muted">{guide.description}</p>
      <div className="mt-10 space-y-5 text-foreground/90 leading-relaxed">
        {guide.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-12 border-t border-white/10 pt-6 text-sm text-muted">
        Ready to look?{' '}
        <Link href={`/${locale}/bikes`} className="text-accent underline">
          Browse bikes on ThrottleLK
        </Link>
      </p>
    </main>
  );
}
