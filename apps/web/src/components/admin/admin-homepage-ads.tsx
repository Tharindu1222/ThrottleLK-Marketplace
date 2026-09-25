'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBlob, apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type Tab = 'requests' | 'live' | 'settings';

type PackageRow = {
  id: string;
  kind: 'bike' | 'part';
  name: string;
  durationDays: number;
  priceLkr: number;
  sortOrder: number;
  isActive: boolean;
};

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
  slipContentType?: string;
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
  listing?: { id: string; title: string } | null;
  partListing?: { id: string; title: string } | null;
};

const field =
  'w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)]';
const btn =
  'rounded-lg bg-[var(--admin-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50';
const btnGhost =
  'rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-surface)]';

export function AdminHomepageAds() {
  const [tab, setTab] = useState<Tab>('requests');
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [pkgKind, setPkgKind] = useState<'bike' | 'part'>('bike');
  const [pkgName, setPkgName] = useState('');
  const [pkgDays, setPkgDays] = useState('7');
  const [pkgPrice, setPkgPrice] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');

  const [placeKind, setPlaceKind] = useState<'bike' | 'part'>('bike');
  const [placeQ, setPlaceQ] = useState('');
  const [placeHits, setPlaceHits] = useState<{ id: string; title: string }[]>([]);
  const [placeDays, setPlaceDays] = useState('7');

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

  async function addPackage() {
    const access = token();
    if (!access) return;
    await apiSend('/api/v1/admin/promotions/packages', {
      token: access,
      body: {
        kind: pkgKind,
        name: pkgName,
        durationDays: Number(pkgDays),
        priceLkr: Number(pkgPrice),
      },
    });
    setPkgName('');
    setPkgPrice('');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">
          Homepage ads
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Review payment slips, manage live placements, and edit packages.
        </p>
      </div>

      <div className="flex gap-2">
        {(['requests', 'live', 'settings'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-2 text-sm capitalize ${
              tab === key
                ? 'bg-[var(--admin-accent)] text-white'
                : 'bg-[var(--admin-surface)] text-[var(--admin-muted)]'
            }`}
          >
            {key}
            {key === 'requests' && pending.length > 0
              ? ` (${pending.length})`
              : ''}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      {tab === 'requests' ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No pending requests.</p>
          ) : null}
          {pending.map((row) => {
            const title = row.listing?.title ?? row.partListing?.title ?? 'Listing';
            return (
              <article
                key={row.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] p-4"
              >
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  {title}{' '}
                  <span className="text-[var(--admin-muted)]">
                    · {row.subjectType} · {row.package?.name} · Rs.{' '}
                    {row.package?.priceLkr.toLocaleString('en-LK')}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {row.seller?.firstName} {row.seller?.lastName} · {row.seller?.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => void viewSlip(row.id, row.slipContentType)}
                  >
                    View slip
                  </button>
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
                    onClick={() => setRejectId(row.id)}
                  >
                    Reject
                  </button>
                </div>
                {rejectId === row.id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      className={field}
                      placeholder="Reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button
                      type="button"
                      className={btn}
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
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] p-4">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Add manually
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className={field}
                value={placeKind}
                onChange={(e) => setPlaceKind(e.target.value as 'bike' | 'part')}
              >
                <option value="bike">Bike</option>
                <option value="part">Part</option>
              </select>
              <input
                className={field}
                placeholder="Search title"
                value={placeQ}
                onChange={(e) => setPlaceQ(e.target.value)}
              />
              <input
                className={`${field} w-24`}
                value={placeDays}
                onChange={(e) => setPlaceDays(e.target.value)}
                aria-label="Days"
              />
              <button type="button" className={btn} onClick={() => void searchPlace()}>
                Search
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {placeHits.map((hit) => (
                <li key={hit.id} className="flex items-center justify-between text-sm">
                  <span>{hit.title}</span>
                  <button type="button" className={btnGhost} onClick={() => void place(hit.id)}>
                    Place
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {placements.map((row) => (
            <article
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] p-4"
            >
              <div>
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  {row.listing?.title ?? row.partListing?.title}
                </p>
                <p className="text-xs text-[var(--admin-muted)]">
                  Until {new Date(row.endsAt).toLocaleDateString()} · {row.source}
                </p>
              </div>
              <button type="button" className={btnGhost} onClick={() => void endNow(row.id)}>
                Remove now
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium text-[var(--admin-text)]">Packages</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className={field}
                value={pkgKind}
                onChange={(e) => setPkgKind(e.target.value as 'bike' | 'part')}
              >
                <option value="bike">Bike</option>
                <option value="part">Part</option>
              </select>
              <input
                className={field}
                placeholder="Name"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
              />
              <input
                className={`${field} w-24`}
                placeholder="Days"
                value={pkgDays}
                onChange={(e) => setPkgDays(e.target.value)}
              />
              <input
                className={`${field} w-32`}
                placeholder="Price LKR"
                value={pkgPrice}
                onChange={(e) => setPkgPrice(e.target.value)}
              />
              <button type="button" className={btn} onClick={() => void addPackage()}>
                Add
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {packages.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between text-sm text-[var(--admin-text)]"
                >
                  <span>
                    {row.kind} · {row.name} · {row.durationDays}d · Rs.{' '}
                    {row.priceLkr.toLocaleString('en-LK')}
                    {row.isActive ? '' : ' (off)'}
                  </span>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => void togglePackage(row)}
                  >
                    {row.isActive ? 'Disable' : 'Enable'}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--admin-text)]">
              Bank accounts
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                className={field}
                placeholder="Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <input
                className={field}
                placeholder="Account name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
              <input
                className={field}
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <input
                className={field}
                placeholder="Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <button type="button" className={`${btn} mt-2`} onClick={() => void addBank()}>
              Add account
            </button>
            <ul className="mt-3 space-y-2">
              {banks.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between text-sm text-[var(--admin-text)]"
                >
                  <span>
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

          <section>
            <h2 className="text-lg font-medium text-[var(--admin-text)]">
              WhatsApp number
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                className={field}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0771234567"
              />
              <button type="button" className={btn} onClick={() => void saveWhatsapp()}>
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {slipUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
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
            className="relative z-10 max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}
