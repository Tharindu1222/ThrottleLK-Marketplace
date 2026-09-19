'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type DocType = 'insurance' | 'revenue_license' | 'ownership_cr';
type DocStatus = 'missing' | 'ok' | 'expiring_soon' | 'expired';

type InventoryDoc = {
  type: DocType;
  present: boolean;
  status: DocStatus;
  fileUrl: string | null;
  fileName: string | null;
  expiresAt: string | null;
};

type InventoryItem = {
  id: string;
  title: string;
  brandName: string | null;
  modelName: string | null;
  manufactureYear: number | null;
  purchaseDate: string | null;
  costPriceLkr: number | null;
  askingPriceLkr: number | null;
  soldPriceLkr: number | null;
  soldAt: string | null;
  listingId: string | null;
  listingSlug: string | null;
  status: string;
  daysInStock: number;
  marginLkr: number | null;
  marginPercent: number | null;
  documents: InventoryDoc[];
  documentAlert: DocStatus;
};

const DOC_TYPES: DocType[] = [
  'insurance',
  'revenue_license',
  'ownership_cr',
];

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function statusLabel(locale: Locale, status: string) {
  switch (status) {
    case 'in_stock':
      return t(locale, 'inventoryStatusInStock');
    case 'draft':
      return t(locale, 'statusDraft');
    case 'pending_review':
      return t(locale, 'statusPendingReview');
    case 'active':
      return t(locale, 'statusActive');
    case 'paused':
      return t(locale, 'statusPaused');
    case 'rejected':
      return t(locale, 'statusRejected');
    case 'sold':
      return t(locale, 'statusSold');
    default:
      return status.replace(/_/g, ' ');
  }
}

function docTypeLabel(locale: Locale, type: DocType) {
  switch (type) {
    case 'insurance':
      return t(locale, 'inventoryDocInsurance');
    case 'revenue_license':
      return t(locale, 'inventoryDocRevenueLicense');
    case 'ownership_cr':
      return t(locale, 'inventoryDocOwnership');
  }
}

function docStatusLabel(locale: Locale, status: DocStatus) {
  switch (status) {
    case 'missing':
      return t(locale, 'inventoryDocMissing');
    case 'ok':
      return t(locale, 'inventoryDocOk');
    case 'expiring_soon':
      return t(locale, 'inventoryDocExpiring');
    case 'expired':
      return t(locale, 'inventoryDocExpired');
  }
}

function docStatusClass(status: DocStatus) {
  switch (status) {
    case 'expired':
      return 'text-red-700';
    case 'expiring_soon':
      return 'text-amber-800';
    case 'missing':
      return 'text-muted';
    default:
      return 'text-emerald-800';
  }
}

const inputClass =
  'mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-accent';
const labelClass = 'block text-xs font-medium text-muted';
const btnAccent =
  'inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50';
const btnGhost =
  'inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-[#f7f7f7] px-3 text-sm font-medium text-foreground hover:bg-white disabled:opacity-50';

export function InventoryClient({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError('auth');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<InventoryItem[]>(
        '/api/v1/dealers/mine/inventory',
        { token },
      );
      setItems(data);
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: number }).status)
          : 0;
      if (status === 401) setError('auth');
      else if (status === 403) setError('dealer');
      else
        setError(
          err instanceof Error ? err.message : 'Something went wrong',
        );
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items?.find((i) => i.id === selectedId) ?? null;

  if (error === 'auth') {
    return (
      <p className="text-sm text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/inventory`)}`}
          className="text-accent underline"
        >
          {t(locale, 'signInRequired')}
        </Link>
      </p>
    );
  }

  if (error === 'dealer') {
    return (
      <div className="rounded-lg border border-black/10 bg-[#f7f7f7] p-4">
        <p className="font-medium text-foreground">
          {t(locale, 'noActiveShowroom')}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t(locale, 'noActiveShowroomHint')}
        </p>
        <Link
          href={`/${locale}/dealers/apply`}
          className={`${btnAccent} mt-4`}
        >
          {t(locale, 'becomeDealer')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {items ? `${items.length} items` : '…'}
        </p>
        <button
          type="button"
          className={btnAccent}
          onClick={() => setShowAdd(true)}
        >
          {t(locale, 'inventoryAddBike')}
        </button>
      </div>

      {error && error !== 'auth' && error !== 'dealer' ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !items ? (
        <p className="text-sm text-muted">{t(locale, 'loadingProfile')}</p>
      ) : null}

      {!loading && items && items.length === 0 ? (
        <p className="text-sm text-muted">{t(locale, 'inventoryEmpty')}</p>
      ) : null}

      {items && items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f7f7] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventoryTitle')}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventoryStatus')}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventoryCostPrice')}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventoryAskingPrice')}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'daysInStock')}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventorySoldPrice')}
                </th>
                <th className="px-3 py-2 font-medium">{t(locale, 'margin')}</th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, 'inventoryDocuments')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`cursor-pointer border-t border-black/5 hover:bg-black/[0.02] ${
                    selectedId === item.id ? 'bg-accent/5' : ''
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {item.title}
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {statusLabel(locale, item.status)}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.costPriceLkr != null
                      ? formatLkr(item.costPriceLkr)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.askingPriceLkr != null
                      ? formatLkr(item.askingPriceLkr)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">{item.daysInStock}</td>
                  <td className="px-3 py-2.5">
                    {item.soldPriceLkr != null
                      ? formatLkr(item.soldPriceLkr)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.marginLkr != null
                      ? `${formatLkr(item.marginLkr)}${
                          item.marginPercent != null
                            ? ` (${item.marginPercent}%)`
                            : ''
                        }`
                      : '—'}
                  </td>
                  <td
                    className={`px-3 py-2.5 ${docStatusClass(item.documentAlert)}`}
                  >
                    {docStatusLabel(locale, item.documentAlert)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showAdd ? (
        <AddBikePanel
          locale={locale}
          busy={busy}
          onClose={() => setShowAdd(false)}
          onSubmit={async (body) => {
            const token = getAccessToken();
            if (!token) return;
            setBusy(true);
            try {
              const created = await apiSend<InventoryItem>(
                '/api/v1/dealers/mine/inventory',
                { method: 'POST', token, body },
              );
              setItems((prev) => (prev ? [created, ...prev] : [created]));
              setSelectedId(created.id);
              setShowAdd(false);
              } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Something went wrong',
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {selected ? (
        <DetailPanel
          locale={locale}
          item={selected}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onUpdated={(next) => {
            setItems((prev) =>
              prev
                ? prev.map((row) => (row.id === next.id ? next : row))
                : [next],
            );
          }}
          setBusy={setBusy}
          setError={setError}
        />
      ) : null}
    </div>
  );
}

function AddBikePanel({
  locale,
  busy,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('');
  const [modelName, setModelName] = useState('');
  const [year, setYear] = useState('');
  const [cost, setCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [asking, setAsking] = useState('');

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-foreground">
        {t(locale, 'inventoryAddBike')}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelClass}>{t(locale, 'inventoryTitle')}</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          <span className={labelClass}>Brand</span>
          <input
            className={inputClass}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>Model</span>
          <input
            className={inputClass}
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>{t(locale, 'year')}</span>
          <input
            className={inputClass}
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>
            {t(locale, 'inventoryPurchaseDate')}
          </span>
          <input
            className={inputClass}
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>{t(locale, 'inventoryCostPrice')}</span>
          <input
            className={inputClass}
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>
            {t(locale, 'inventoryAskingPrice')}
          </span>
          <input
            className={inputClass}
            type="number"
            value={asking}
            onChange={(e) => setAsking(e.target.value)}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">
        {t(locale, 'inventoryPrivateHint')}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={btnAccent}
          disabled={busy || title.trim().length < 2}
          onClick={() =>
            void onSubmit({
              title: title.trim(),
              brandName: brandName.trim() || null,
              modelName: modelName.trim() || null,
              manufactureYear: year ? Number(year) : null,
              purchaseDate: purchaseDate || null,
              costPriceLkr: cost ? Number(cost) : null,
              askingPriceLkr: asking ? Number(asking) : null,
            })
          }
        >
          {t(locale, 'inventorySave')}
        </button>
        <button type="button" className={btnGhost} onClick={onClose}>
          {t(locale, 'cancelEdit')}
        </button>
      </div>
    </div>
  );
}

function DetailPanel({
  locale,
  item,
  busy,
  onClose,
  onUpdated,
  setBusy,
  setError,
}: {
  locale: Locale;
  item: InventoryItem;
  busy: boolean;
  onClose: () => void;
  onUpdated: (item: InventoryItem) => void;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [cost, setCost] = useState(
    item.costPriceLkr != null ? String(item.costPriceLkr) : '',
  );
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate ?? '');
  const [asking, setAsking] = useState(
    item.askingPriceLkr != null ? String(item.askingPriceLkr) : '',
  );
  const [soldPrice, setSoldPrice] = useState(
    item.soldPriceLkr != null ? String(item.soldPriceLkr) : '',
  );
  const [soldDate, setSoldDate] = useState(
    item.soldAt ? item.soldAt.slice(0, 10) : '',
  );
  const [expiryByType, setExpiryByType] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const d of item.documents) {
        if (d.expiresAt) map[d.type] = d.expiresAt;
      }
      return map;
    },
  );

  useEffect(() => {
    setTitle(item.title);
    setCost(item.costPriceLkr != null ? String(item.costPriceLkr) : '');
    setPurchaseDate(item.purchaseDate ?? '');
    setAsking(item.askingPriceLkr != null ? String(item.askingPriceLkr) : '');
    setSoldPrice(item.soldPriceLkr != null ? String(item.soldPriceLkr) : '');
    setSoldDate(item.soldAt ? item.soldAt.slice(0, 10) : '');
    const map: Record<string, string> = {};
    for (const d of item.documents) {
      if (d.expiresAt) map[d.type] = d.expiresAt;
    }
    setExpiryByType(map);
  }, [item]);

  async function saveFields() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiSend<InventoryItem>(
        `/api/v1/dealers/mine/inventory/${item.id}`,
        {
          method: 'PATCH',
          token,
          body: {
            title: title.trim(),
            costPriceLkr: cost ? Number(cost) : null,
            purchaseDate: purchaseDate || null,
            askingPriceLkr: asking ? Number(asking) : null,
          },
        },
      );
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }

  async function markSold() {
    const token = getAccessToken();
    if (!token || !soldPrice) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiSend<InventoryItem>(
        `/api/v1/dealers/mine/inventory/${item.id}/mark-sold`,
        {
          method: 'POST',
          token,
          body: {
            soldPriceLkr: Number(soldPrice),
            soldAt: soldDate || undefined,
          },
        },
      );
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(type: DocType, file: File) {
    const token = getAccessToken();
    if (!token) return;
    const needsExpiry = type === 'insurance' || type === 'revenue_license';
    const expiresAt = expiryByType[type];
    if (needsExpiry && !expiresAt) {
      setError(t(locale, 'inventoryExpiresAt'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await apiUpload<InventoryItem>(
        `/api/v1/dealers/mine/inventory/${item.id}/documents/${type}`,
        file,
        token,
        needsExpiry && expiresAt ? { expiresAt } : undefined,
      );
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeDoc(type: DocType) {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiSend<InventoryItem>(
        `/api/v1/dealers/mine/inventory/${item.id}/documents/${type}`,
        { method: 'DELETE', token },
      );
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium text-foreground">{item.title}</h2>
          <p className="text-sm text-muted">
            {statusLabel(locale, item.status)} · {item.daysInStock}{' '}
            {t(locale, 'daysInStock').toLowerCase()}
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={onClose}>
          {t(locale, 'cancelEdit')}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelClass}>{t(locale, 'inventoryTitle')}</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>{t(locale, 'inventoryCostPrice')}</span>
          <input
            className={inputClass}
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>
            {t(locale, 'inventoryPurchaseDate')}
          </span>
          <input
            className={inputClass}
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>
            {t(locale, 'inventoryAskingPrice')}
          </span>
          <input
            className={inputClass}
            type="number"
            value={asking}
            onChange={(e) => setAsking(e.target.value)}
            disabled={Boolean(item.listingId)}
          />
        </label>
        <p className="sm:col-span-2 text-xs text-muted">
          {t(locale, 'inventoryPrivateHint')}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnAccent}
          disabled={busy}
          onClick={() => void saveFields()}
        >
          {t(locale, 'inventorySave')}
        </button>
        {item.listingSlug ? (
          <Link
            href={`/${locale}/bikes/${item.listingSlug}`}
            className={btnGhost}
          >
            {t(locale, 'inventoryOpenListing')}
          </Link>
        ) : null}
      </div>

      {item.status !== 'sold' ? (
        <div className="mt-6 border-t border-black/10 pt-4">
          <h3 className="text-sm font-medium text-foreground">
            {t(locale, 'markSold')}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelClass}>
                {t(locale, 'inventorySoldPrice')}
              </span>
              <input
                className={inputClass}
                type="number"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
              />
            </label>
            <label>
              <span className={labelClass}>{t(locale, 'soldDate')}</span>
              <input
                className={inputClass}
                type="date"
                value={soldDate}
                onChange={(e) => setSoldDate(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className={`${btnGhost} mt-3`}
            disabled={busy || !soldPrice}
            onClick={() => void markSold()}
          >
            {t(locale, 'markSold')}
          </button>
        </div>
      ) : null}

      <div className="mt-6 border-t border-black/10 pt-4">
        <h3 className="text-sm font-medium text-foreground">
          {t(locale, 'inventoryDocuments')}
        </h3>
        <ul className="mt-3 space-y-4">
          {DOC_TYPES.map((type) => {
            const doc =
              item.documents.find((d) => d.type === type) ??
              ({
                type,
                present: false,
                status: 'missing' as const,
                fileUrl: null,
                fileName: null,
                expiresAt: null,
              } satisfies InventoryDoc);
            const needsExpiry =
              type === 'insurance' || type === 'revenue_license';
            return (
              <li
                key={type}
                className="rounded-md border border-black/8 bg-[#fafafa] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {docTypeLabel(locale, type)}
                    </p>
                    <p className={`text-xs ${docStatusClass(doc.status)}`}>
                      {docStatusLabel(locale, doc.status)}
                      {doc.expiresAt ? ` · ${doc.expiresAt}` : ''}
                    </p>
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent underline"
                      >
                        {doc.fileName || 'View'}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {needsExpiry ? (
                      <input
                        type="date"
                        className="rounded-md border border-black/10 px-2 py-1.5 text-xs"
                        value={expiryByType[type] ?? ''}
                        onChange={(e) =>
                          setExpiryByType((prev) => ({
                            ...prev,
                            [type]: e.target.value,
                          }))
                        }
                        aria-label={t(locale, 'inventoryExpiresAt')}
                      />
                    ) : null}
                    <label className={`${btnGhost} cursor-pointer`}>
                      {doc.present
                        ? t(locale, 'inventoryReplaceDoc')
                        : t(locale, 'inventoryUploadDoc')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadDoc(type, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {doc.present ? (
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={busy}
                        onClick={() => void removeDoc(type)}
                      >
                        {t(locale, 'inventoryRemoveDoc')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
