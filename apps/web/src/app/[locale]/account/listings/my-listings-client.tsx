'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Listing = {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceLkr: number;
  coverImageUrl?: string | null;
};

export function MyListingsClient({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(access: string) {
    const data = await apiGet<Listing[]>('/api/v1/listings/mine', {
      token: access,
    });
    setListings(data);
  }

  function runAction(listingId: string, path: string) {
    if (!token) return;
    setBusyId(listingId);
    setError(null);
    void apiSend(path, { token })
      .then(() => load(token))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Action failed'),
      )
      .finally(() => setBusyId(null));
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {listings.length === 0 ? (
        <p className="text-muted">
          No listings yet.{' '}
          <Link href={`/${locale}/sell`} className="text-accent underline">
            {t(locale, 'createListing')}
          </Link>
        </p>
      ) : (
        listings.map((listing) => (
          <div
            key={listing.id}
            className="border border-white/10 bg-surface/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-4">
                {listing.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.coverImageUrl}
                    alt=""
                    className="h-20 w-28 object-cover ring-1 ring-white/10"
                  />
                ) : null}
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl">
                    {listing.title}
                  </p>
                  <p className="text-sm text-muted">
                    {t(locale, 'status')}: {listing.status} · Rs.{' '}
                    {listing.priceLkr.toLocaleString('en-LK')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {listing.status !== 'sold' ? (
                  <Link
                    href={`/${locale}/account/listings/${listing.id}/edit`}
                    className="border border-white/20 px-3 py-1.5 text-sm hover:border-accent"
                  >
                    Edit
                  </Link>
                ) : null}
                {listing.status === 'active' ? (
                  <>
                    <Link
                      href={`/${locale}/bikes/${listing.slug}`}
                      className="text-sm text-accent underline self-center"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      className="border border-white/20 px-3 py-1.5 text-sm"
                      onClick={() =>
                        runAction(
                          listing.id,
                          `/api/v1/listings/${listing.id}/pause`,
                        )
                      }
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      className="border border-white/20 px-3 py-1.5 text-sm"
                      onClick={() =>
                        runAction(
                          listing.id,
                          `/api/v1/listings/${listing.id}/mark-sold`,
                        )
                      }
                    >
                      Mark sold
                    </button>
                  </>
                ) : null}
                {listing.status === 'paused' ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      className="bg-accent px-3 py-1.5 text-sm text-white"
                      onClick={() =>
                        runAction(
                          listing.id,
                          `/api/v1/listings/${listing.id}/resume`,
                        )
                      }
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      className="border border-white/20 px-3 py-1.5 text-sm"
                      onClick={() =>
                        runAction(
                          listing.id,
                          `/api/v1/listings/${listing.id}/mark-sold`,
                        )
                      }
                    >
                      Mark sold
                    </button>
                  </>
                ) : null}
                {['draft', 'rejected'].includes(listing.status) ? (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    className="bg-accent px-3 py-1.5 text-sm text-white"
                    onClick={() =>
                      runAction(
                        listing.id,
                        `/api/v1/listings/${listing.id}/submit`,
                      )
                    }
                  >
                    {t(locale, 'submitForReview')}
                  </button>
                ) : null}
              </div>
            </div>
            {listing.status !== 'sold' ? (
              <ListingImageManager
                listingId={listing.id}
                onChange={() => void load(token)}
              />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
