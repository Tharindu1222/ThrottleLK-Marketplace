import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { title: 'Contact' };
  return pageMetadata({
    title: t(locale, 'contactTitle'),
    description: t(locale, 'contactLead'),
    path: `/${locale}/contact`,
    locale,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="break-words font-[family-name:var(--font-display)] text-3xl tracking-wide sm:text-4xl">
        {t(locale, 'contactTitle')}
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-muted sm:text-lg">{t(locale, 'contactLead')}</p>
      <div className="mt-8 max-w-prose space-y-4 leading-relaxed break-words text-foreground/90">
        {supportEmail ? (
          <p>
            {t(locale, 'contactSupportEmail')}:{' '}
            <a className="break-all text-accent underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
        ) : (
          <p>{t(locale, 'contactNoEmail')}</p>
        )}
        <p>
          <Link href={`/${locale}/guides`} className="text-accent underline">
            {t(locale, 'contactGuides')}
          </Link>
          {' · '}
          <Link href={`/${locale}/rules`} className="text-accent underline">
            {t(locale, 'legalRulesLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
