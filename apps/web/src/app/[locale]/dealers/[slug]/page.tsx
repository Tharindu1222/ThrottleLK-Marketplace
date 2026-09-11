import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Dealer = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  address: string | null;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
    return pageMetadata({
      title: `${dealer.name} — motorcycle dealer`,
      description:
        dealer.description?.slice(0, 160) ??
        `${dealer.name} showroom on ThrottleLK`,
      path: `/${locale}/dealers/${slug}`,
    });
  } catch {
    return { title: 'Dealer not found' };
  }
}

export default async function DealerShowroomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let dealer: Dealer;
  try {
    dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
  } catch {
    notFound();
  }

  const listings = await apiGet<Listing[]>('/api/v1/listings', {
    searchParams: { dealerId: dealer.id },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm tracking-[0.25em] text-accent uppercase">Dealer</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {dealer.name}
      </h1>
      {dealer.description ? (
        <p className="mt-4 max-w-2xl text-muted">{dealer.description}</p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        {dealer.address ? `${dealer.address} · ` : ''}
        {dealer.phone}
        {dealer.whatsapp ? ` · WhatsApp ${dealer.whatsapp}` : ''}
      </p>

      <h2 className="mt-12 font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Inventory
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted">No active bikes in this showroom yet.</p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="border border-white/10 bg-surface/40 p-4 hover:border-accent/40"
            >
              <h3 className="font-[family-name:var(--font-display)] text-xl">
                {listing.title}
              </h3>
              <p className="mt-2 text-accent">
                Rs. {listing.priceLkr.toLocaleString('en-LK')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {listing.manufactureYear}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
