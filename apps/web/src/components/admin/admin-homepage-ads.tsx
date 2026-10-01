'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { partListingHref } from '@/lib/part-kind';

type Tab = 'requests' | 'live' | 'settings';

type PromoTier = 'boost' | 'featured' | 'premium';
type PromoSurface = 'home' | 'browse' | 'detail';

type PackageRow = {
  id: string;
  kind: 'bike' | 'part';
  name: string;
  durationDays: number;
  priceLkr: number;
  sortOrder: number;
  isActive: boolean;
  tier: PromoTier;
  surfaces: PromoSurface[];
  priority: number;
};

const TIER_DEFAULTS: Record<
  PromoTier,
  { surfaces: PromoSurface[]; priority: number }
> = {
  boost: { surfaces: ['browse', 'detail'], priority: 10 },
  featured: { surfaces: ['home', 'browse', 'detail'], priority: 20 },
  premium: { surfaces: ['home', 'browse', 'detail'], priority: 30 },
};

const TIER_LABELS: Record<PromoTier, string> = {
  boost: 'Boost',
  featured: 'Featured',
  premium: 'Premium',
};

const SURFACE_LABELS: Record<PromoSurface, string> = {
  home: 'Home',
  browse: 'Browse',
  detail: 'Detail',
};

const ALL_SURFACES: PromoSurface[] = ['home', 'browse', 'detail'];

const TIER_ORDER: PromoTier[] = ['boost', 'featured', 'premium'];

const fieldLabel = 'block text-sm text-[var(--admin-muted)]';

function packageForSlot(
  rows: PackageRow[],
  kind: 'bike' | 'part',
  tier: PromoTier,
) {
  const matches = rows.filter(
    (row) => row.kind === kind && (row.tier ?? 'featured') === tier,
  );
  return matches.find((row) => row.isActive) ?? matches[0] ?? null;
}

function TierBadge({ tier }: { tier: PromoTier }) {
  return (
    <span className="inline-flex rounded-md bg-[var(--admin-accent-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--admin-accent-2)]">
      {TIER_LABELS[tier]}
    </span>
  );
}

function PackageSlot({
  kind,
  tier,
  existing,
  onSaved,
  onError,
}: {
  kind: 'bike' | 'part';
  tier: PromoTier;
  existing: PackageRow | null;
  onSaved: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const defaults = TIER_DEFAULTS[tier];
  const [name, setName] = useState(existing?.name ?? TIER_LABELS[tier]);
  const [days, setDays] = useState(
    String(existing?.durationDays ?? (tier === 'premium' ? 14 : 7)),
  );
  const [price, setPrice] = useState(existing ? String(existing.priceLkr) : '');
  const [surfaces, setSurfaces] = useState<PromoSurface[]>(
    existing?.surfaces?.length ? [...existing.surfaces] : [...defaults.surfaces],
  );
  const [active, setActive] = useState(existing?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(existing?.name ?? TIER_LABELS[tier]);
    setDays(String(existing?.durationDays ?? (tier === 'premium' ? 14 : 7)));
    setPrice(existing ? String(existing.priceLkr) : '');
    setSurfaces(
      existing?.surfaces?.length ? [...existing.surfaces] : [...defaults.surfaces],
    );
    setActive(existing?.isActive ?? true);
  }, [existing, tier, defaults.surfaces]);

  function toggleSurface(surface: PromoSurface) {
    setSurfaces((prev) =>
      prev.includes(surface)
        ? prev.filter((item) => item !== surface)
        : [...prev, surface],
    );
  }

  async function save() {
    const durationDays = Number(days);
    const priceLkr = Number(price);
    if (
      !name.trim() ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      !Number.isInteger(priceLkr) ||
      priceLkr < 0
    ) {
      onError('Enter a name, a whole number of days, and a price.');
      return;
    }
    if (surfaces.length === 0) {
      onError('Select at least one surface');
      return;
    }
    const access = getAccessToken();
    if (!access) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        durationDays,
        priceLkr,
        surfaces,
        priority: defaults.priority,
        isActive: active,
      };
      if (existing) {
        await apiSend(`/api/v1/admin/promotions/packages/${existing.id}`, {
          method: 'PATCH',
          token: access,
          body,
        });
      } else {
        await apiSend('/api/v1/admin/promotions/packages', {
          token: access,
          body: { ...body, kind, tier },
        });
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save package');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="grid gap-3 border-b border-[var(--admin-border)] py-4 last:border-b-0 lg:grid-cols-[6.5rem_minmax(8rem,1.1fr)_5.5rem_7.5rem_minmax(12rem,1.3fr)_auto] lg:items-end">
      <div className="lg:pb-2">
        <TierBadge tier={tier} />
      </div>
      <div className="min-w-0">
        <label htmlFor={`${kind}-${tier}-name`} className={fieldLabel}>
          Name
        </label>
        <input
          id={`${kind}-${tier}-name`}
          className="admin-field mt-1"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="min-w-0">
        <label htmlFor={`${kind}-${tier}-days`} className={fieldLabel}>
          Days
        </label>
        <input
          id={`${kind}-${tier}-days`}
          className="admin-field mt-1"
          inputMode="numeric"
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </div>
      <div className="min-w-0">
        <label htmlFor={`${kind}-${tier}-price`} className={fieldLabel}>
          Price (LKR)
        </label>
        <input
          id={`${kind}-${tier}-price`}
          className="admin-field mt-1"
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </div>
      <fieldset className="min-w-0">
        <legend className={fieldLabel}>Surfaces</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {ALL_SURFACES.map((surface) => (
            <label
              key={surface}
              htmlFor={`${kind}-${tier}-${surface}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 text-sm text-[var(--admin-text)]"
            >
              <input
                id={`${kind}-${tier}-${surface}`}
                type="checkbox"
                checked={surfaces.includes(surface)}
                onChange={() => toggleSurface(surface)}
              />
              {SURFACE_LABELS[surface]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <label
          htmlFor={`${kind}-${tier}-active`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--admin-text)]"
        >
          <input
            id={`${kind}-${tier}-active`}
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
        <button
          type="button"
          className="admin-btn-primary inline-flex min-h-11 items-center px-3 py-2 text-sm disabled:opacity-50"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>
    </li>
  );
}

type RequestListing = {
  id: string;
  title: string;
  slug?: string;
  priceLkr?: number;
  status?: string;
  manufactureYear?: number;
  condition?: string;
  coverImageUrl?: string | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

type RequestPart = {
  id: string;
  title: string;
  slug?: string;
  kind?: string;
  priceLkr?: number;
  status?: string;
  condition?: string;
  coverImageUrl?: string | null;
  category?: { name: string } | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

type RequestRow = {
  id: string;
  subjectType: string;
  status: string;
  createdAt: string;
  chargedPriceLkr?: number | null;
  rejectionReason?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
  package?: { name: string; priceLkr: number; durationDays: number };
  seller?: { email: string; firstName: string; lastName: string };
  listing?: RequestListing | null;
  partListing?: RequestPart | null;
};

function listingViewHref(locale: string, row: RequestRow) {
  if (row.listing?.slug) return `/${locale}/bikes/${row.listing.slug}`;
  if (row.partListing?.slug) {
    return partListingHref(
      locale,
      row.partListing.kind ?? 'spare',
      row.partListing.slug,
    );
  }
  return null;
}

type PlacementRow = {
  id: string;
  subjectType: 'bike' | 'part';
  source: string;
  tier: PromoTier;
  startsAt: string;
  endsAt: string;
  title: string;
  coverImageUrl: string | null;
};

function formatPromoDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function LivePlacementCard({
  row,
  onEnd,
}: {
  row: PlacementRow;
  onEnd: (id: string) => void;
}) {
  return (
    <article className="admin-card flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 gap-4">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)]">
          {row.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[var(--admin-faint)]">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--admin-text)]">
            {row.title}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-text)]">
            {TIER_LABELS[row.tier]}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--admin-muted)]">
            <span>Started {formatPromoDay(row.startsAt)}</span>
            <span>Ends {formatPromoDay(row.endsAt)}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">{row.source}</p>
        </div>
      </div>
      <button type="button" className={btnDanger} onClick={() => void onEnd(row.id)}>
        Remove now
      </button>
    </article>
  );
}

const inline =
  'admin-field-inline w-full! min-w-0! max-w-none! sm:w-auto! sm:min-w-[9rem]! sm:max-w-[16rem]!';
const btn = 'admin-btn-primary inline-flex min-h-11 shrink-0 items-center px-3 py-2 text-sm disabled:opacity-50';
const btnGhost = 'admin-btn-ghost inline-flex min-h-11 shrink-0 items-center px-3 py-2 text-sm disabled:opacity-50';
const btnDanger =
  'inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 disabled:opacity-50';

export function AdminHomepageAds() {
  const params = useParams<{ locale: string }>();
  const [tab, setTab] = useState<Tab>('requests');
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [placeKind, setPlaceKind] = useState<'bike' | 'part'>('bike');
  const [placeQ, setPlaceQ] = useState('');
  const [placeHits, setPlaceHits] = useState<{ id: string; title: string }[]>([]);
  const [placeDays, setPlaceDays] = useState('7');
  const [placePackageId, setPlacePackageId] = useState('');

  const token = () => getAccessToken();

  const load = useCallback(async () => {
    const access = token();
    if (!access) return;
    setError(null);
    try {
      const [reqs, live, pkgs] = await Promise.all([
        apiGet<RequestRow[]>('/api/v1/admin/promotions/requests', { token: access }),
        apiGet<PlacementRow[]>('/api/v1/admin/promotions/placements', {
          token: access,
        }),
        apiGet<PackageRow[]>('/api/v1/admin/promotions/packages', {
          token: access,
        }),
      ]);
      setRequests(reqs);
      setPlacements(live);
      setPackages(pkgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    const access = token();
    if (!access) return;
    await apiSend(`/api/v1/admin/promotions/requests/${id}/approve`, {
      token: access,
    });
    await load();
  }

  async function reject(id: string) {
    const access = token();
    if (!access || !rejectReason.trim()) return;
    await apiSend(`/api/v1/admin/promotions/requests/${id}/reject`, {
      token: access,
      body: { reason: rejectReason.trim() },
    });
    setRejectId(null);
    setRejectReason('');
    await load();
  }

  async function searchPlace() {
    const access = token();
    if (!access) return;
    const hits = await apiGet<{ id: string; title: string }[]>(
      '/api/v1/admin/promotions/search',
      {
        token: access,
        searchParams: { kind: placeKind, q: placeQ },
      },
    );
    setPlaceHits(hits);
  }

  async function place(id: string) {
    const access = token();
    if (!access) return;
    await apiSend('/api/v1/admin/promotions/placements', {
      token: access,
      body: {
        subjectType: placeKind,
        listingId: placeKind === 'bike' ? id : undefined,
        partListingId: placeKind === 'part' ? id : undefined,
        durationDays: Number(placeDays),
        packageId: placePackageId || undefined,
      },
    });
    setPlaceHits([]);
    setPlaceQ('');
    await load();
  }

  async function endNow(id: string) {
    const access = token();
    if (!access) return;
    await apiSend(`/api/v1/admin/promotions/placements/${id}/end`, {
      token: access,
    });
    await load();
  }

  const pending = requests.filter(
    (row) => row.status === 'pending' && row.paymentStatus === 'paid',
  );
  const liveListings = placements.filter((row) => row.subjectType === 'bike');
  const liveParts = placements.filter((row) => row.subjectType === 'part');

  const tabs: { id: Tab; label: string }[] = [
    {
      id: 'requests',
      label:
        pending.length > 0 ? `Requests (${pending.length})` : 'Requests',
    },
    { id: 'live', label: 'Live' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Promotions sections"
        className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-2)]'
                  : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        <Link
          href={`/${params.locale}/admin/monetize`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-muted)] transition hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]"
        >
          Monetize
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'requests' ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="admin-card px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--admin-text)]">
                No pending requests
              </p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Paid PayHere promotions waiting for approval appear here.
              </p>
            </div>
          ) : null}
          {pending.map((row) => {
            const subject = row.partListing ?? row.listing;
            const title = subject?.title ?? 'Listing';
            const cover = subject?.coverImageUrl;
            const viewHref = listingViewHref(params.locale, row);
            const place = [subject?.city?.name, subject?.district?.name]
              .filter(Boolean)
              .join(', ');
            const bikeBits = [
              row.listing?.brand?.name,
              row.listing?.model?.name,
              row.listing?.manufactureYear
                ? String(row.listing.manufactureYear)
                : null,
            ].filter(Boolean);
            const partBits = [
              row.partListing?.kind === 'modified'
                ? 'Modified'
                : row.partListing?.kind === 'accessory'
                  ? 'Rider Accessories'
                  : row.partListing
                    ? 'Spare'
                    : null,
              row.partListing?.category?.name,
              row.partListing?.condition,
            ].filter(Boolean);
            const detailBits = [
              ...(row.partListing ? partBits : bikeBits),
              place || null,
              subject?.priceLkr != null
                ? `Rs. ${subject.priceLkr.toLocaleString('en-LK')}`
                : null,
            ].filter(Boolean);
            const charged = row.chargedPriceLkr ?? row.package?.priceLkr;
            return (
              <article key={row.id} className="admin-card p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[var(--admin-faint)]">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--admin-text)]">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {detailBits.join(' · ') || row.subjectType}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {row.package?.name}
                      {row.package?.durationDays
                        ? ` · ${row.package.durationDays} days`
                        : ''}
                      {charged != null
                        ? ` · Rs. ${charged.toLocaleString('en-LK')}`
                        : ''}
                      {' · Paid'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-faint)]">
                      {row.seller?.firstName} {row.seller?.lastName} · {row.seller?.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewHref ? (
                    <Link
                      href={viewHref}
                      className={btnGhost}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={btn}
                    onClick={() => void approve(row.id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      setRejectId(row.id);
                      setRejectReason('');
                    }}
                  >
                    Reject
                  </button>
                </div>
                {rejectId === row.id ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <input
                      className={`${inline} min-w-[12rem] flex-1 max-w-none`}
                      placeholder="Reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => {
                        setRejectId(null);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => void reject(row.id)}
                    >
                      Confirm
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {tab === 'live' ? (
        <div className="space-y-4">
          <div className="admin-card p-4">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Add manually
            </p>
            <div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <label htmlFor="place-kind" className={fieldLabel}>
                  Kind
                </label>
                <select
                  id="place-kind"
                  className="admin-field mt-1"
                  value={placeKind}
                  onChange={(e) => {
                    setPlaceKind(e.target.value as 'bike' | 'part');
                    setPlacePackageId('');
                  }}
                >
                  <option value="bike">Bike</option>
                  <option value="part">Part</option>
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="place-package" className={fieldLabel}>
                  Package
                </label>
                <select
                  id="place-package"
                  className="admin-field mt-1"
                  value={placePackageId}
                  onChange={(e) => {
                    setPlacePackageId(e.target.value);
                    const pkg = packages.find((row) => row.id === e.target.value);
                    if (pkg) setPlaceDays(String(pkg.durationDays));
                  }}
                >
                  <option value="">Optional</option>
                {packages
                  .filter((row) => {
                    if (row.kind !== placeKind || !row.isActive) return false;
                    const slot = packageForSlot(
                      packages,
                      placeKind,
                      row.tier ?? 'featured',
                    );
                    return slot?.id === row.id;
                  })
                  .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.tier} · {row.name} · {row.durationDays}d
                      </option>
                    ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="place-title" className={fieldLabel}>
                  Search title
                </label>
                <input
                  id="place-title"
                  className="admin-field mt-1"
                  value={placeQ}
                  onChange={(e) => setPlaceQ(e.target.value)}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="place-days" className={fieldLabel}>
                  Days
                </label>
                <input
                  id="place-days"
                  className="admin-field mt-1"
                  value={placeDays}
                  onChange={(e) => setPlaceDays(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                className={btn}
                onClick={() => void searchPlace()}
              >
                Search
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {placeHits.map((hit) => (
                <li
                  key={hit.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate text-[var(--admin-text)]">{hit.title}</span>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => void place(hit.id)}
                  >
                    Place
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {liveListings.length === 0 && liveParts.length === 0 ? (
            <div className="admin-card px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--admin-text)]">
                No live placements
              </p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Approved promos and manual placements show up here while active.
              </p>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-[var(--admin-text)]">
                  Listings ({liveListings.length})
                </h2>
                {liveListings.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">No live listings</p>
                ) : (
                  liveListings.map((row) => (
                    <LivePlacementCard key={row.id} row={row} onEnd={endNow} />
                  ))
                )}
              </section>
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-[var(--admin-text)]">
                  Parts ({liveParts.length})
                </h2>
                {liveParts.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">No live parts</p>
                ) : (
                  liveParts.map((row) => (
                    <LivePlacementCard key={row.id} row={row} onEnd={endNow} />
                  ))
                )}
              </section>
            </>
          )}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <section className="admin-card p-4 sm:p-5">
          <h2 className="text-lg font-medium text-[var(--admin-text)]">Packages</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Bikes and parts each have three packages: Boost, Featured, and Premium. Edit those instead of adding more.
          </p>
          <div className="mt-6 space-y-8">
            {(['bike', 'part'] as const).map((kind) => (
              <div key={kind}>
                <h3 className="text-sm font-medium text-[var(--admin-text)]">
                  {kind === 'bike' ? 'Bikes' : 'Parts'}
                </h3>
                <ul className="mt-1">
                  {TIER_ORDER.map((tier) => (
                    <PackageSlot
                      key={`${kind}-${tier}`}
                      kind={kind}
                      tier={tier}
                      existing={packageForSlot(packages, kind, tier)}
                      onSaved={load}
                      onError={setError}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  );
}
