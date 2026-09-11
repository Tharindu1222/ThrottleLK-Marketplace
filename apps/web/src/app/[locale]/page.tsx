import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';

type Brand = { id: string; name: string; slug: string };
type District = { id: string; name: string; slug: string };

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [brands, districts] = await Promise.all([
    apiGet<Brand[]>('/api/v1/brands').catch(() => [] as Brand[]),
    apiGet<District[]>('/api/v1/locations/districts').catch(
      () => [] as District[],
    ),
  ]);

  return (
    <>
      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(242,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,230,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-6 py-16">
          <p className="mb-4 font-[family-name:var(--font-display)] text-sm tracking-[0.35em] text-accent uppercase">
            Sri Lanka
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight text-foreground sm:text-8xl">
            {t(locale, 'brand')}
          </h1>
          <p className="mt-6 max-w-xl text-xl text-foreground/90 sm:text-2xl">
            {t(locale, 'tagline')}
          </p>
          <p className="mt-3 max-w-lg text-base text-muted">
            {t(locale, 'support')}
          </p>
          <div className="mt-10">
            <Link
              href={`/${locale}/bikes`}
              className="inline-flex items-center bg-accent px-5 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-background"
            >
              {t(locale, 'homeCta')}
            </Link>
          </div>
        </div>
      </main>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Browse by brand
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/${locale}/brands/${brand.slug}`}
                className="border border-white/15 px-3 py-1.5 text-sm hover:border-accent"
              >
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Browse by district
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {districts.map((district) => (
            <li key={district.id}>
              <Link
                href={`/${locale}/locations/${district.slug}`}
                className="border border-white/15 px-3 py-1.5 text-sm hover:border-accent"
              >
                {district.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
