'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Option = { id: string; name: string };
type Dealer = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const fieldClass =
  'w-full rounded-full border border-black/10 bg-surface/90 px-5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

const areaClass =
  'w-full resize-y rounded-2xl border border-black/10 bg-surface/90 px-5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

const cardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function PartsDealerApplyForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [mine, setMine] = useState<Dealer[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<Dealer[]>('/api/v1/parts-dealers/mine', { token: access }),
      apiGet<Option[]>('/api/v1/locations/districts'),
    ])
      .then(([d, districtsList]) => {
        setMine(d);
        setDistricts(districtsList);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  useEffect(() => {
    if (!districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${districtId}/cities`,
    ).then(setCities);
  }, [districtId]);

  if (!token) {
    return (
      <div className={`${cardClass} p-6 sm:p-8`}>
        <p className="text-sm text-muted">{t(locale, 'dealerApplyLogin')}</p>
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/parts-dealers/apply`)}`}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110"
        >
          {t(locale, 'login')}
        </Link>
      </div>
    );
  }

  if (mine.length > 0) {
    const dealer = mine[0];
    const pending = dealer.status !== 'active';
    return (
      <div className={`${cardClass} p-6 sm:p-8`}>
        <p className="text-[11px] tracking-[0.14em] text-muted uppercase">
          {t(locale, 'dealerStatus')}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
          {dealer.name}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex border px-2.5 py-1 text-[11px] tracking-wide uppercase ${
              pending
                ? 'border-amber-600/20 bg-amber-50 text-amber-900'
                : 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
            }`}
          >
            {statusLabel(dealer.status)}
          </span>
        </div>
        {pending ? (
          <p className="mt-4 text-sm text-muted">
            {t(locale, 'dealerPendingHint')}
          </p>
        ) : (
          <Link
            href={`/${locale}/parts-dealers/${dealer.slug}`}
            className="mt-5 inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
          >
            {t(locale, 'viewShowroom')}
          </Link>
        )}
        {ok ? <p className="mt-4 text-sm text-foreground">{ok}</p> : null}
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const dealer = await apiSend<Dealer>('/api/v1/parts-dealers', {
        token: token!,
        body: {
          name: String(form.get('name')),
          description: String(form.get('description') || '') || undefined,
          phone: String(form.get('phone')),
          whatsapp: String(form.get('whatsapp') || '') || undefined,
          email: String(form.get('email') || '') || undefined,
          address: String(form.get('address') || '') || undefined,
          districtId: String(form.get('districtId')),
          cityId: String(form.get('cityId')),
        },
      });
      setMine([dealer]);
      setOk(t(locale, 'dealerApplicationSubmitted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} p-6 sm:p-8`}>
      <div className="grid gap-5">
        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'dealershipName')}
          </span>
          <input
            name="name"
            required
            placeholder={t(locale, 'dealershipName')}
            className={fieldClass}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'aboutDealership')}
          </span>
          <textarea
            name="description"
            rows={4}
            placeholder={t(locale, 'aboutDealership')}
            className={areaClass}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'phone')}
            </span>
            <input
              name="phone"
              required
              placeholder={t(locale, 'phone')}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'whatsapp')}
            </span>
            <input
              name="whatsapp"
              placeholder={t(locale, 'whatsapp')}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'email')}
          </span>
          <input
            name="email"
            type="email"
            placeholder={t(locale, 'email')}
            className={fieldClass}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
            {t(locale, 'address')}
          </span>
          <input
            name="address"
            placeholder={t(locale, 'address')}
            className={fieldClass}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'districtFilter')}
            </span>
            <select
              name="districtId"
              required
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className={fieldClass}
            >
              <option value="">{t(locale, 'districtFilter')}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
              {t(locale, 'city')}
            </span>
            <select name="cityId" required className={fieldClass}>
              <option value="">{t(locale, 'city')}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
          >
            {busy ? '…' : t(locale, 'submitDealerApplication')}
          </button>
        </div>

        {ok ? <p className="text-sm text-foreground">{ok}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
