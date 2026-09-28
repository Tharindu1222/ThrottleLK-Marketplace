import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegalPage, type LegalSlug } from '@/content/legal';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type I18nKey = Parameters<typeof t>[1];

export async function legalMetadata(
  locale: string,
  slug: LegalSlug,
): Promise<Metadata> {
  const page = getLegalPage(slug);
  if (!page || !isLocale(locale)) return { title: 'Not found' };
  return pageMetadata({
    title: t(locale, page.titleKey as I18nKey),
    description: t(locale, page.descriptionKey as I18nKey),
    path: `/${locale}/${slug}`,
    locale,
  });
}

export async function LegalDocumentPage({
  params,
  slug,
}: {
  params: Promise<{ locale: string }>;
  slug: LegalSlug;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const page = getLegalPage(slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, page.titleKey as I18nKey)}
      </h1>
      <p className="mt-4 text-lg text-muted">
        {t(locale, page.descriptionKey as I18nKey)}
      </p>
      <p className="mt-3 text-sm text-muted">
        {process.env.NEXT_PUBLIC_LEGAL_REVIEW_SIGNED === 'true'
          ? t(locale, 'legalReviewSigned')
          : t(locale, 'legalReviewPending')}
      </p>
      <div className="mt-10 space-y-10">
        {page.sections.map((section) => (
          <section key={section.headingKey}>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {t(locale, section.headingKey as I18nKey)}
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-foreground/90">
              {section.bodyKeys.map((key) => (
                <p key={key}>{t(locale, key as I18nKey)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
