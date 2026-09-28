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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'contactTitle')}
      </h1>
      <p className="mt-4 text-lg text-muted">{t(locale, 'contactLead')}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-foreground/90">
        {supportEmail ? (
          <p>
            {t(locale, 'contactSupportEmail')}:{' '}
            <a className="text-accent underline" href={`mailto:${supportEmail}`}>
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
