'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, type ReactNode, useEffect, useState } from 'react';
import { OwnedDealerStatus } from '@/components/owned-dealer-status';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { apiCodeMessage } from '@/lib/listing-errors';
import { pickOwnedDealer } from '@/lib/owned-dealer';

type Option = { id: string; name: string };
type Dealer = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const fieldClass =
  'h-10 w-full appearance-none rounded-xl border border-[#d4d4d8] bg-white py-2 pr-3 pl-10 text-sm text-foreground outline-none transition placeholder:text-[#9ca3af] focus:border-accent/45 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:opacity-60';
const areaClass =
  'min-h-[56px] w-full resize-none rounded-xl border border-[#d4d4d8] bg-white py-2 pr-3 pl-10 text-sm text-foreground outline-none transition placeholder:text-[#9ca3af] focus:border-accent/45 focus:ring-2 focus:ring-accent/15';
const labelClass = 'mb-0.5 block text-[13px] font-semibold text-foreground';
const requiredMark = <span className="text-accent"> *</span>;

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-3 z-[1] -translate-y-1/2 text-[#9ca3af] [&_svg]:h-4 [&_svg]:w-4">
      {children}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 10h16l-1.2 9H5.2L4 10z" strokeLinejoin="round" />
      <path d="M3.5 10 6 5h12l2.5 5" strokeLinejoin="round" />
      <path d="M10 19v-5h4v5" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path
        d="M8.5 4.5h3l1 3.5-2 1.2a11 11 0 0 0 5.3 5.3l1.2-2 3.5 1v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 7.6 1.5 1.5 0 0 1 6.5 6h2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.56 14.86L2.3 21.7l4.95-1.3A9.9 9.9 0 1 0 12.04 2zm5.75 14.08c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.83-.11a10.4 10.4 0 0 1-3.1-1.7 11.5 11.5 0 0 1-3.72-4.4c-.39-.74-.82-1.92-.55-2.73.17-.5.62-.82 1.14-.96.2-.05.4-.03.58.1l1.33.97c.17.12.28.3.28.5 0 .1-.03.2-.08.29l-.48.83c-.08.14-.1.3-.03.45.36.78 1.42 2.2 2.6 2.9.2.12.44.14.63.05l1.08-.5c.17-.08.37-.05.5.08l1.32 1.2c.3.27.2.72-.03 1.3z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="m3.5 7 5.5-2.5 6 2.5L20.5 4.5v12.5L15 19.5l-6-2.5L3.5 19.5V7z" strokeLinejoin="round" />
      <path d="M9 4.5v12.5M15 7v12.5" strokeLinecap="round" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 20V9l5-2v13M9 20V6l6 3v11M15 20V9l5-2v13" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  );
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#9ca3af]">
        <ChevronIcon />
      </span>
    </div>
  );
}

function ApplyShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100dvh-4.25rem)] w-full overflow-x-hidden lg:h-[calc(100dvh-4.25rem)] lg:overflow-hidden">
      <Image
        src="/images/dealers/become-dealer-hero.png"
        alt=""
        fill
        priority
        className="object-cover object-[0%_95%] scale-[1.1] -translate-x-[6%] lg:scale-[1.12] lg:-translate-x-[8%]"
        sizes="100vw"
      />

      <div className="relative z-10 flex h-full w-full items-stretch">
        <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-end lg:px-8 lg:py-8 xl:px-12">
          <section className="flex w-full max-w-[560px] shrink-0 flex-col self-start lg:mt-2 lg:max-w-[640px] lg:self-center xl:max-w-[700px]">
            <div className="mb-5 lg:-mt-6 xl:-mt-8">
              <p className="text-xs font-bold tracking-[0.16em] text-accent uppercase">
                {t(locale, 'dealersNav')}
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.25rem] lg:leading-[1.08]">
                {t(locale, 'becomeDealer')}
              </h1>
            </div>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

const formCardClass =
  'rounded-2xl border border-accent/10 bg-white p-5 shadow-[0_4px_6px_-1px_rgba(225,6,0,0.08),0_16px_40px_-8px_rgba(225,6,0,0.22),0_28px_56px_-12px_rgba(225,6,0,0.18)] sm:p-6 lg:p-6';

export function DealerApplyForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [mine, setMine] = useState<Dealer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setLoaded(true);
      return;
    }
    void Promise.all([
      apiGet<Dealer[]>('/api/v1/dealers/mine', { token: access }),
      apiGet<Option[]>('/api/v1/locations/districts'),
    ])
      .then(([d, districtsList]) => {
        setMine(d);
        setDistricts(districtsList);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoaded(true));
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

  if (!loaded) {
    return (
      <ApplyShell locale={locale}>
        <div
          className="h-[420px] animate-pulse rounded-2xl bg-black/[0.04] shadow-sm"
          aria-busy="true"
        />
      </ApplyShell>
    );
  }

  if (!token) {
    return (
      <ApplyShell locale={locale}>
        <div className={formCardClass}>
          <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
            {t(locale, 'dealerApplyFormEyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {t(locale, 'dealerApplyFormTitle')}
          </h2>
          <p className="mt-5 text-sm text-muted">{t(locale, 'dealerApplyLogin')}</p>
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/dealers/apply`)}`}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:bg-[#c90500]"
          >
            {t(locale, 'login')}
            <ArrowRightIcon />
          </Link>
        </div>
      </ApplyShell>
    );
  }

  const owned = pickOwnedDealer(mine);
  if (owned) {
    return (
      <ApplyShell locale={locale}>
        <div className={formCardClass}>
          <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
            {t(locale, 'dealersNav')}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {t(locale, 'yourBikeDealer')}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t(locale, 'becomeDealerExistingHint')}
          </p>
          <div className="mt-6">
            <OwnedDealerStatus
              locale={locale}
              kind="bike"
              dealer={owned}
              ok={ok}
            />
          </div>
        </div>
      </ApplyShell>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
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
      setOk(t(locale, 'dealerApplicationSubmitted'));
    } catch (err) {
      setError(
        apiCodeMessage(err, locale) ??
          (err instanceof Error ? err.message : 'Failed'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ApplyShell locale={locale}>
      <form onSubmit={onSubmit} className={formCardClass}>
        <p className="text-[11px] font-bold tracking-[0.14em] text-accent uppercase">
          {t(locale, 'dealerApplyFormEyebrow')}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {t(locale, 'dealerApplyFormTitle')}
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          {t(locale, 'dealerApplyFormHint')}
        </p>

        <div className="mt-3.5 flex flex-col gap-2.5">
          <div>
            <label className={labelClass} htmlFor="dealer-name">
              {t(locale, 'dealershipName')}
              {requiredMark}
            </label>
            <div className="relative">
              <IconWrap>
                <ShopIcon />
              </IconWrap>
              <input
                id="dealer-name"
                name="name"
                required
                placeholder={t(locale, 'dealershipName')}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="dealer-about">
              {t(locale, 'aboutDealership')}
              {requiredMark}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-2 left-3 z-[1] text-[#9ca3af] [&_svg]:h-4 [&_svg]:w-4">
                <DocIcon />
              </span>
              <textarea
                id="dealer-about"
                name="description"
                required
                rows={2}
                placeholder={t(locale, 'aboutDealership')}
                className={areaClass}
              />
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="dealer-phone">
                {t(locale, 'phone')}
                {requiredMark}
              </label>
              <div className="relative">
                <IconWrap>
                  <PhoneIcon />
                </IconWrap>
                <input
                  id="dealer-phone"
                  name="phone"
                  required
                  placeholder={t(locale, 'phone')}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="dealer-whatsapp">
                {t(locale, 'whatsapp')}
                {requiredMark}
              </label>
              <div className="relative">
                <IconWrap>
                  <WhatsAppIcon />
                </IconWrap>
                <input
                  id="dealer-whatsapp"
                  name="whatsapp"
                  required
                  placeholder={t(locale, 'whatsapp')}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="dealer-email">
                {t(locale, 'email')}
                {requiredMark}
              </label>
              <div className="relative">
                <IconWrap>
                  <MailIcon />
                </IconWrap>
                <input
                  id="dealer-email"
                  name="email"
                  type="email"
                  required
                  placeholder={t(locale, 'email')}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="dealer-address">
                {t(locale, 'address')}
                {requiredMark}
              </label>
              <div className="relative">
                <IconWrap>
                  <PinIcon />
                </IconWrap>
                <input
                  id="dealer-address"
                  name="address"
                  required
                  placeholder={t(locale, 'address')}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="dealer-district">
                {t(locale, 'districtFilter')}
                {requiredMark}
              </label>
              <SelectShell>
                <div className="relative">
                  <IconWrap>
                    <MapIcon />
                  </IconWrap>
                  <select
                    id="dealer-district"
                    name="districtId"
                    required
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className={`${fieldClass} pr-9`}
                  >
                    <option value="">{t(locale, 'districtFilter')}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </SelectShell>
            </div>
            <div>
              <label className={labelClass} htmlFor="dealer-city">
                {t(locale, 'city')}
                {requiredMark}
              </label>
              <SelectShell>
                <div className="relative">
                  <IconWrap>
                    <CityIcon />
                  </IconWrap>
                  <select
                    id="dealer-city"
                    name="cityId"
                    required
                    disabled={!districtId}
                    className={`${fieldClass} pr-9`}
                  >
                    <option value="">{t(locale, 'city')}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </SelectShell>
            </div>
          </div>

          {ok ? <p className="text-sm text-foreground">{ok}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
            <Link
              href={`/${locale}/dealers`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/12 bg-white px-5 text-sm font-medium text-foreground transition hover:bg-black/[0.02]"
            >
              {t(locale, 'cancel')}
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(225,6,0,0.7)] transition hover:bg-[#c90500] disabled:opacity-60"
            >
              {busy ? '…' : t(locale, 'submitDealerApplication')}
              {!busy ? <ArrowRightIcon /> : null}
            </button>
          </div>
        </div>
      </form>
    </ApplyShell>
  );
}
