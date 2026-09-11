import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  mileage: number | null;
  condition: string;
  districtId: string;
  coverImageUrl?: string | null;
};

type Brand = { id: string; name: string; slug: string };
type District = { id: string; name: string; slug: string };

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

export default async function BikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const brandId = typeof sp.brandId === 'string' ? sp.brandId : undefined;
  const districtId =
    typeof sp.districtId === 'string' ? sp.districtId : undefined;
  const minPrice = typeof sp.minPrice === 'string' ? sp.minPrice : undefined;
  const maxPrice = typeof sp.maxPrice === 'string' ? sp.maxPrice : undefined;

  const [listings, brands, districts] = await Promise.all([
    apiGet<Listing[]>('/api/v1/listings', {
      searchParams: { q, brandId, districtId, minPrice, maxPrice },
    }),
    apiGet<Brand[]>('/api/v1/brands'),
    apiGet<District[]>('/api/v1/locations/districts'),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'browse')}
      </h1>

      <form className="mt-8 grid gap-3 border border-white/10 bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, 'searchPlaceholder')}
          className="bg-background px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-accent lg:col-span-2"
        />
        <select
          name="brandId"
          defaultValue={brandId}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        >
          <option value="">{t(locale, 'brandFilter')}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="districtId"
          defaultValue={districtId}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        >
          <option value="">{t(locale, 'districtFilter')}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          name="minPrice"
          defaultValue={minPrice}
          placeholder={t(locale, 'minPrice')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <input
          name="maxPrice"
          defaultValue={maxPrice}
          placeholder={t(locale, 'maxPrice')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <button
          type="submit"
          className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] tracking-wide text-background sm:col-span-2 lg:col-span-6"
        >
          {t(locale, 'applyFilters')}
        </button>
      </form>

      <SaveSearchButton
        locale={locale}
        filters={{ q, brandId, districtId, minPrice, maxPrice }}
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            {t(locale, 'noListings')}
          </p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="block overflow-hidden border border-white/10 bg-surface/40 transition hover:border-accent/50"
            >
              {listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.coverImageUrl}
                  alt=""
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 items-center justify-center bg-background/50 text-sm text-muted">
                  No photo
                </div>
              )}
              <div className="p-5">
                <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                  {listing.title}
                </h2>
                <p className="mt-2 text-accent">{formatLkr(listing.priceLkr)}</p>
                <p className="mt-2 text-sm text-muted">
                  {listing.manufactureYear}
                  {listing.mileage != null
                    ? ` · ${listing.mileage.toLocaleString()} km`
                    : ''}{' '}
                  · {listing.condition}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
