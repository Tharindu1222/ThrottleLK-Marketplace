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
  address: string | null;
  coverImageUrl: string | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: 'Motorcycle dealers in Sri Lanka',
    description: 'Browse approved dealer showrooms on ThrottleLK.',
    path: `/${locale}/dealers`,
  });
}

export default async function DealersIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dealers = await apiGet<Dealer[]>('/api/v1/dealers').catch(
    () => [] as Dealer[],
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
            Dealers
          </h1>
          <p className="mt-2 text-muted">Approved showrooms on ThrottleLK.</p>
        </div>
        <Link
          href={`/${locale}/dealers/apply`}
          className="bg-accent px-4 py-2 text-sm text-background"
        >
          Become a dealer
        </Link>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.length === 0 ? (
          <p className="text-muted">No approved dealers yet.</p>
        ) : (
          dealers.map((dealer) => {
            const location = [dealer.city?.name, dealer.district?.name]
              .filter(Boolean)
              .join(', ');
            return (
              <Link
                key={dealer.id}
                href={`/${locale}/dealers/${dealer.slug}`}
                className="overflow-hidden border border-white/10 bg-surface/40 hover:border-accent/40"
              >
                {dealer.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dealer.coverImageUrl}
                    alt={dealer.name}
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-background/50 text-sm text-muted">
                    No photo
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl">
                    {dealer.name}
                  </h2>
                  {location ? (
                    <p className="mt-2 text-sm text-muted">{location}</p>
                  ) : null}
                  {dealer.address ? (
                    <p className="mt-1 text-sm text-muted">{dealer.address}</p>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
