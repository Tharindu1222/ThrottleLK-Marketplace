'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { apiBlob, apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';

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

type BankRow = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string | null;
  isDefault: boolean;
  isActive: boolean;
};

type RequestRow = {
  id: string;
  subjectType: string;
  status: string;
  createdAt: string;
  rejectionReason?: string | null;
  slipContentType?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
  package?: { name: string; priceLkr: number; durationDays: number };
  seller?: { email: string; firstName: string; lastName: string };
  listing?: { id: string; title: string } | null;
  partListing?: { id: string; title: string } | null;
};

type PlacementRow = {
  id: string;
  subjectType: string;
  source: string;
  startsAt: string;
  endsAt: string;
  tier?: PromoTier;
  surfaces?: PromoSurface[];
  priority?: number;
  listing?: { id: string; title: string } | null;
  partListing?: { id: string; title: string } | null;
};

const inline =
  'admin-field-inline w-full! min-w-0! max-w-none! sm:w-auto! sm:min-w-[9rem]! sm:max-w-[16rem]!';
const full = 'admin-field';
const btn = 'admin-btn-primary inline-flex min-h-11 shrink-0 items-center px-3 py-2 text-sm disabled:opacity-50';
const btnGhost = 'admin-btn-ghost inline-flex min-h-11 shrink-0 items-center px-3 py-2 text-sm disabled:opacity-50';
const btnDanger =
  'inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 disabled:opacity-50';

export function AdminHomepageAds() {
  const [tab, setTab] = useState<Tab>('requests');
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const slipDialogId = `admin-homepage-ad-slip-${useId().replace(/:/g, '')}`;
  useDialogFocusTrap(Boolean(slipUrl), slipDialogId);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [pkgKind, setPkgKind] = useState<'bike' | 'part'>('bike');
  const [pkgName, setPkgName] = useState('');
  const [pkgDays, setPkgDays] = useState('7');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgTier, setPkgTier] = useState<PromoTier>('featured');
  const [pkgSurfaces, setPkgSurfaces] = useState<PromoSurface[]>(
    TIER_DEFAULTS.featured.surfaces,
  );
  const [pkgPriority, setPkgPriority] = useState(
    String(TIER_DEFAULTS.featured.priority),
  );

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');

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
      const [reqs, live, pkgs, accs, settings] = await Promise.all([
        apiGet<RequestRow[]>('/api/v1/admin/promotions/requests', { token: access }),
        apiGet<PlacementRow[]>('/api/v1/admin/promotions/placements', {
          token: access,
        }),
        apiGet<PackageRow[]>('/api/v1/admin/promotions/packages', {
          token: access,
        }),
        apiGet<BankRow[]>('/api/v1/admin/promotions/bank-accounts', {
          token: access,
        }),
        apiGet<{ whatsapp: string | null }>('/api/v1/admin/promotions/settings', {
          token: access,
        }),
      ]);
      setRequests(reqs);
      setPlacements(live);
      setPackages(pkgs);
      setBanks(accs);
      setWhatsapp(settings.whatsapp ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function viewSlip(id: string, contentType?: string) {
    const access = token();
    if (!access) return;
    const blob = await apiBlob(
      `/api/v1/admin/promotions/requests/${id}/slip`,
      access,
    );
    const url = URL.createObjectURL(blob);
    if (contentType === 'application/pdf') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSlipUrl(url);
  }

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

  function applyTierDefaults(tier: PromoTier) {
    const defaults = TIER_DEFAULTS[tier];
    setPkgTier(tier);
    setPkgSurfaces(defaults.surfaces);
    setPkgPriority(String(defaults.priority));
  }

  function toggleSurface(surface: PromoSurface) {
    setPkgSurfaces((prev) =>
      prev.includes(surface)
        ? prev.filter((s) => s !== surface)
        : [...prev, surface],
    );
  }

  async function addPackage() {
    const access = token();
    if (!access) return;
    if (pkgSurfaces.length === 0) {
      setError('Select at least one surface');
      return;
    }
    await apiSend('/api/v1/admin/promotions/packages', {
      token: access,
      body: {
        kind: pkgKind,
        name: pkgName,
        durationDays: Number(pkgDays),
        priceLkr: Number(pkgPrice),
        tier: pkgTier,
        surfaces: pkgSurfaces,
        priority: Number(pkgPriority),
      },
    });
    setPkgName('');
    setPkgPrice('');
    applyTierDefaults('featured');
    await load();
  }

  async function togglePackage(row: PackageRow) {
    const access = token();
    if (!access) return;
    await apiSend(`/api/v1/admin/promotions/packages/${row.id}`, {
      method: 'PATCH',
      token: access,
      body: { isActive: !row.isActive },
    });
    await load();
  }

  async function addBank() {
    const access = token();
    if (!access) return;
    await apiSend('/api/v1/admin/promotions/bank-accounts', {
      token: access,
      body: {
        bankName,
        accountName,
        accountNumber,
        branch: branch || null,
        isDefault: banks.length === 0,
      },
    });
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setBranch('');
    await load();
  }

  async function makeDefault(id: string) {
    const access = token();
    if (!access) return;
    await apiSend(`/api/v1/admin/promotions/bank-accounts/${id}`, {
      method: 'PATCH',
      token: access,
      body: { isDefault: true },
    });
    await load();
  }

  async function saveWhatsapp() {
    const access = token();
    if (!access) return;
    await apiSend('/api/v1/admin/promotions/settings', {
      method: 'PATCH',
      token: access,
      body: { whatsapp: whatsapp || null },
    });
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

  const pending = requests.filter((row) => row.status === 'pending');

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
                When sellers submit promo payment slips, they appear here.
              </p>
            </div>
          ) : null}
          {pending.map((row) => {
            const title = row.listing?.title ?? row.partListing?.title ?? 'Listing';
            return (
              <article key={row.id} className="admin-card p-4">
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  {title}{' '}
                  <span className="text-[var(--admin-muted)]">
                    · {row.subjectType} · {row.package?.name} · Rs.{' '}
                    {row.package?.priceLkr.toLocaleString('en-LK')}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {row.seller?.firstName} {row.seller?.lastName} · {row.seller?.email}
                  {row.paymentProvider
                    ? ` · ${row.paymentProvider}${
                        row.paymentStatus ? ` (${row.paymentStatus})` : ''
                      }`
                    : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.slipContentType ? (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => void viewSlip(row.id, row.slipContentType ?? undefined)}
                    >
                      View slip
                    </button>
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
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                className={inline}
                value={placeKind}
                onChange={(e) => {
                  setPlaceKind(e.target.value as 'bike' | 'part');
                  setPlacePackageId('');
                }}
              >
                <option value="bike">Bike</option>
                <option value="part">Part</option>
              </select>
              <select
                className={inline}
                value={placePackageId}
                onChange={(e) => {
                  setPlacePackageId(e.target.value);
                  const pkg = packages.find((row) => row.id === e.target.value);
                  if (pkg) setPlaceDays(String(pkg.durationDays));
                }}
                aria-label="Package"
              >
                <option value="">Package (optional)</option>
                {packages
                  .filter((row) => row.kind === placeKind && row.isActive)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.tier} · {row.name} · {row.durationDays}d
                    </option>
                  ))}
              </select>
              <input
                className={`${inline} min-w-[12rem]`}
                placeholder="Search title"
                value={placeQ}
                onChange={(e) => setPlaceQ(e.target.value)}
              />
              <input
                className={`${inline} min-w-[4.5rem] w-20`}
                value={placeDays}
                onChange={(e) => setPlaceDays(e.target.value)}
                aria-label="Days"
              />
              <button
                type="button"
                className={`${btn} ml-auto`}
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
          {placements.length === 0 ? (
            <div className="admin-card px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--admin-text)]">
                No live placements
              </p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Approved promos and manual placements show up here while active.
              </p>
            </div>
          ) : null}
          {placements.map((row) => (
            <article
              key={row.id}
              className="admin-card flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                  {row.listing?.title ?? row.partListing?.title}
                </p>
                <p className="text-xs text-[var(--admin-muted)]">
                  {TIER_LABELS[row.tier ?? 'featured']} · Until{' '}
                  {new Date(row.endsAt).toLocaleDateString('en-LK')} ·{' '}
                  {row.source}
                </p>
              </div>
              <button
                type="button"
                className={btnDanger}
                onClick={() => void endNow(row.id)}
              >
                Remove now
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-4">
          <section className="admin-card p-4">
            <h2 className="text-lg font-medium text-[var(--admin-text)]">Packages</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                className={inline}
                value={pkgKind}
                onChange={(e) => setPkgKind(e.target.value as 'bike' | 'part')}
              >
                <option value="bike">Bike</option>
                <option value="part">Part</option>
              </select>
              <input
                className={`${inline} min-w-[10rem]`}
                placeholder="Name"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
              />
              <input
                className={`${inline} min-w-[4.5rem] w-20`}
                placeholder="Days"
                value={pkgDays}
                onChange={(e) => setPkgDays(e.target.value)}
              />
              <input
                className={`${inline} min-w-[7rem]`}
                placeholder="Price LKR"
                value={pkgPrice}
                onChange={(e) => setPkgPrice(e.target.value)}
              />
              <select
                className={inline}
                value={pkgTier}
                onChange={(e) =>
                  applyTierDefaults(e.target.value as PromoTier)
                }
                aria-label="Tier"
              >
                <option value="boost">Boost</option>
                <option value="featured">Featured</option>
                <option value="premium">Premium</option>
              </select>
              <input
                className={`${inline} min-w-[4.5rem] w-20`}
                type="number"
                min={0}
                max={1000}
                placeholder="Priority"
                value={pkgPriority}
                onChange={(e) => setPkgPriority(e.target.value)}
                aria-label="Priority"
              />
              <button
                type="button"
                className={`${btn} ml-auto`}
                onClick={() => void addPackage()}
              >
                Add
              </button>
            </div>
            <fieldset className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <legend className="sr-only">Surfaces</legend>
              <span className="text-xs text-[var(--admin-muted)]">Surfaces</span>
              {ALL_SURFACES.map((surface) => (
                <label
                  key={surface}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-text)]"
                >
                  <input
                    type="checkbox"
                    checked={pkgSurfaces.includes(surface)}
                    onChange={() => toggleSurface(surface)}
                  />
                  {SURFACE_LABELS[surface]}
                </label>
              ))}
            </fieldset>
            <ul className="mt-3 space-y-2">
              {packages.map((row) => {
                const tier = row.tier ?? 'featured';
                const surfaces = row.surfaces?.length
                  ? row.surfaces
                  : TIER_DEFAULTS[tier].surfaces;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 text-sm text-[var(--admin-text)]"
                  >
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex rounded-md bg-[var(--admin-accent-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--admin-accent-2)]"
                      >
                        {TIER_LABELS[tier]}
                      </span>
                      <span className="min-w-0 truncate">
                        {row.kind} · {row.name} · {row.durationDays}d · Rs.{' '}
                        {row.priceLkr.toLocaleString('en-LK')}
                        {row.isActive ? '' : ' (off)'}
                        {' · p'}
                        {row.priority ?? TIER_DEFAULTS[tier].priority}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {surfaces.map((surface) => (
                          <span
                            key={surface}
                            className="rounded border border-[var(--admin-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]"
                          >
                            {SURFACE_LABELS[surface]}
                          </span>
                        ))}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => void togglePackage(row)}
                    >
                      {row.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="admin-card p-4">
            <h2 className="text-lg font-medium text-[var(--admin-text)]">
              Bank accounts
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                className={full}
                placeholder="Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <input
                className={full}
                placeholder="Account name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
              <input
                className={full}
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <input
                className={full}
                placeholder="Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`${btn} mt-3`}
              onClick={() => void addBank()}
            >
              Add account
            </button>
            <ul className="mt-3 space-y-2">
              {banks.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 text-sm text-[var(--admin-text)]"
                >
                  <span className="min-w-0 truncate">
                    {row.bankName} · {row.accountName} · {row.accountNumber}
                    {row.isDefault ? ' · default' : ''}
                  </span>
                  {!row.isDefault ? (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => void makeDefault(row.id)}
                    >
                      Make default
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-card p-4">
            <h2 className="text-lg font-medium text-[var(--admin-text)]">
              WhatsApp number
            </h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                className={`${inline} min-w-[12rem] flex-1 max-w-none`}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0771234567"
              />
              <button
                type="button"
                className={btn}
                onClick={() => void saveWhatsapp()}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {slipUrl ? (
        <div
          id={slipDialogId}
          role="dialog"
          aria-modal="true"
          aria-label="Payment slip"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close slip"
            onClick={() => setSlipUrl(null)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slipUrl}
            alt="Payment slip"
            className="relative z-10 max-h-[90dvh] max-w-[min(100vw-1.5rem,90vw)] rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
