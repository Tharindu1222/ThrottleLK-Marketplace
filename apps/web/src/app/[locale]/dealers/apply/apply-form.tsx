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

export function DealerApplyForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [mine, setMine] = useState<Dealer[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<Dealer[]>('/api/v1/dealers/mine', { token: access }),
      apiGet<Option[]>('/api/v1/locations/districts'),
    ]).then(([d, districtsList]) => {
      setMine(d);
      setDistricts(districtsList);
    });
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
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>{' '}
        to apply as a dealer.
      </p>
    );
  }

  if (mine.length > 0) {
    const dealer = mine[0];
    return (
      <div className="mt-8 border border-white/10 bg-surface/40 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          {dealer.name}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Status: <span className="text-accent">{dealer.status}</span>
        </p>
        {dealer.status === 'active' ? (
          <Link
            href={`/${locale}/dealers/${dealer.slug}`}
            className="mt-4 inline-block text-accent underline"
          >
            View showroom
          </Link>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Waiting for admin approval before your showroom goes public.
          </p>
        )}
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    try {
      const dealer = await apiSend<Dealer>('/api/v1/dealers', {
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
      setOk('Dealer application submitted for review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid max-w-xl gap-3">
      <input
        name="name"
        required
        placeholder="Dealership name"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <textarea
        name="description"
        rows={4}
        placeholder="About your dealership"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="phone"
        required
        placeholder={t(locale, 'phone')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="whatsapp"
        placeholder="WhatsApp"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="email"
        type="email"
        placeholder={t(locale, 'email')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="address"
        placeholder="Address"
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <select
        name="districtId"
        required
        value={districtId}
        onChange={(e) => setDistrictId(e.target.value)}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      >
        <option value="">{t(locale, 'districtFilter')}</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        name="cityId"
        required
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      >
        <option value="">City</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-accent px-4 py-3 font-[family-name:var(--font-display)] text-white"
      >
        Submit dealer application
      </button>
      {ok ? <p className="text-sm text-accent">{ok}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
