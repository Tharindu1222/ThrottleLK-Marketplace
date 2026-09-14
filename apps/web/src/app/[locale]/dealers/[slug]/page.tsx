import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type DealerImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isCover?: boolean;
};

type Dealer = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  coverImageUrl: string | null;
  images: DealerImage[];
  district?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  coverImageUrl?: string | null;
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

  const photos = [...(dealer.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const location = [dealer.city?.name, dealer.district?.name]
    .filter(Boolean)
    .join(', ');

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm tracking-[0.25em] text-accent uppercase">Dealer</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {dealer.name}
      </h1>

      {photos.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`overflow-hidden border border-black/10 bg-surface/40 ${
                index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={`${dealer.name} photo ${index + 1}`}
                className={`w-full object-cover ${
                  index === 0 ? 'aspect-[16/10] sm:h-full' : 'aspect-[4/3]'
                }`}
              />
            </div>
          ))}
        </div>
      ) : null}

      {dealer.description ? (
        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-muted">
          {dealer.description}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 border border-black/10 bg-surface/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {location ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Location</p>
            <p className="mt-1">{location}</p>
          </div>
        ) : null}
        {dealer.address ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Address</p>
            <p className="mt-1">{dealer.address}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Phone</p>
          <p className="mt-1">
            <a href={`tel:${dealer.phone}`} className="hover:text-accent">
              {dealer.phone}
            </a>
          </p>
        </div>
        {dealer.whatsapp ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">WhatsApp</p>
            <p className="mt-1">
              <a
                href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {dealer.whatsapp}
              </a>
            </p>
          </div>
        ) : null}
        {dealer.email ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Email</p>
            <p className="mt-1">
              <a href={`mailto:${dealer.email}`} className="hover:text-accent">
                {dealer.email}
              </a>
            </p>
          </div>
        ) : null}
        {dealer.website ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Website</p>
            <p className="mt-1">
              <a
                href={dealer.website}
                target="_blank"
                rel="noreferrer"
                className="break-all hover:text-accent"
              >
                {dealer.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          </div>
        ) : null}
      </section>

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
              className="overflow-hidden border border-black/10 bg-surface/40 hover:border-accent/40"
            >
              {listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.coverImageUrl}
                  alt={listing.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-background/40 text-sm text-muted">
                  No photo
                </div>
              )}
              <div className="p-4">
                <h3 className="font-[family-name:var(--font-display)] text-xl">
                  {listing.title}
                </h3>
                <p className="mt-2 text-accent">
                  Rs. {listing.priceLkr.toLocaleString('en-LK')}
                </p>
                <p className="mt-1 text-sm text-muted">{listing.manufactureYear}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
