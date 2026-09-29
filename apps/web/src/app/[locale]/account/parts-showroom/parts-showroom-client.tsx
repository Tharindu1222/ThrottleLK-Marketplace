'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ShowroomCoverEditor } from '@/components/showroom-cover-editor';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { clampCoverFocus } from '@/lib/cover-crop';
import { t, type Locale } from '@/lib/i18n';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';

const DealerMapPicker = dynamic(
  () =>
    import('@/components/dealer-map-picker').then((m) => m.DealerMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse border border-black/10 bg-zinc-100" />
    ),
  },
);

type Option = { id: string; name: string };

type DealerShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  districtId: string;
  cityId: string;
  latitude: number | null;
  longitude: number | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  coverFocusX?: number | null;
  coverFocusY?: number | null;
};

type DealerImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

const fieldClass =
  'w-full rounded-full border border-black/10 bg-surface/90 px-5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

const areaClass =
  'w-full resize-y rounded-2xl border border-black/10 bg-surface/90 px-5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

const cardClass =
  'overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="text-xs tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export function PartsShowroomClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [dealer, setDealer] = useState<DealerShop | null | undefined>(undefined);
  const [image, setImage] = useState<DealerImage | null>(null);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reactId = useId();
  const dialogId = `parts-showroom-saved-${reactId.replace(/:/g, '')}`;
  useDialogFocusTrap(Boolean(mounted && ok && dealer), dialogId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [cityId, setCityId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [coverFocusX, setCoverFocusX] = useState(50);
  const [coverFocusY, setCoverFocusY] = useState(50);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ok || !dealer) return;
    const showroomHref = `/${locale}/parts-dealers/${dealer.slug}`;
    const timer = window.setTimeout(() => {
      router.push(showroomHref);
    }, 1800);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.clearTimeout(timer);
        setOk(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ok, dealer, locale, router]);

  function applyDealer(shop: DealerShop) {
    setDealer(shop);
    setName(shop.name);
    setDescription(shop.description ?? '');
    setPhone(shop.phone);
    setWhatsapp(shop.whatsapp ?? '');
    setEmail(shop.email ?? '');
    setWebsite(shop.website ?? '');
    setAddress(shop.address ?? '');
    setDistrictId(shop.districtId);
    setCityId(shop.cityId);
    setLatitude(shop.latitude);
    setLongitude(shop.longitude);
    setFacebookUrl(shop.facebookUrl ?? '');
    setTiktokUrl(shop.tiktokUrl ?? '');
    setCoverFocusX(clampCoverFocus(shop.coverFocusX));
    setCoverFocusY(clampCoverFocus(shop.coverFocusY));
  }

  async function loadImages(access: string, dealerId: string) {
    const rows = await apiGet<DealerImage[]>(
      `/api/v1/parts-dealers/id/${dealerId}/images`,
      { token: access },
    );
    setImage(rows[0] ?? null);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setDealer(null);
      return;
    }
    void (async () => {
      try {
        const [shops, districtsList] = await Promise.all([
          apiGet<DealerShop[]>('/api/v1/parts-dealers/mine', { token: access }),
          apiGet<Option[]>('/api/v1/locations/districts'),
        ]);
        setDistricts(districtsList);
        const active = shops.find((shop) => shop.status === 'active') ?? null;
        if (active) {
          applyDealer(active);
          await loadImages(access, active.id);
        } else {
          setDealer(null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t(locale, 'failedToLoadImages'),
        );
        setDealer(null);
      }
    })();
  }, [locale]);

  useEffect(() => {
    if (!districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${districtId}/cities`,
    ).then(setCities);
  }, [districtId]);

  async function onUploadCover(file: File) {
    if (!token || !dealer) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const uploaded = await apiUpload<DealerImage>(
        `/api/v1/parts-dealers/id/${dealer.id}/images`,
        file,
        token,
      );
      setImage(uploaded);
      setCoverFocusX(50);
      setCoverFocusY(50);
      setDealer({ ...dealer, coverFocusX: 50, coverFocusY: 50 });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'uploadFailed'));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function onSaveCoverFocus(x: number, y: number) {
    if (!token || !dealer) return;
    setError(null);
    try {
      const updated = await apiSend<DealerShop>('/api/v1/parts-dealers/mine', {
        method: 'PATCH',
        token,
        body: { coverFocusX: x, coverFocusY: y },
      });
      applyDealer(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'deleteFailed'));
      throw err;
    }
  }

  function getCurrentPositionOnce(
    options: PositionOptions,
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function geocodeAddressPin(): Promise<{
    lat: number;
    lng: number;
  } | null> {
    const cityName = cities.find((c) => c.id === cityId)?.name;
    const districtName = districts.find((d) => d.id === districtId)?.name;
    const query = [address.trim(), cityName, districtName, 'Sri Lanka']
      .filter(Boolean)
      .join(', ');
    if (!address.trim() && !cityName && !districtName) return null;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'lk');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    const hit = rows[0];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  async function fetchLiveLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // Still try address geocode on devices without geolocation API
      setLocating(true);
      setError(null);
      setLocationNote(null);
      try {
        const pin = await geocodeAddressPin();
        if (pin) {
          setLatitude(pin.lat);
          setLongitude(pin.lng);
          setLocationNote(t(locale, 'locationFromAddress'));
        } else {
          setError(t(locale, 'locationUnavailable'));
        }
      } catch {
        setError(t(locale, 'locationUnavailable'));
      } finally {
        setLocating(false);
      }
      return;
    }

    setError(null);
    setOk(null);
    setLocationNote(null);
    setLocating(true);

    try {
      let pos: GeolocationPosition | null = null;
      try {
        pos = await getCurrentPositionOnce({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60_000,
        });
      } catch {
        try {
          pos = await getCurrentPositionOnce({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60_000,
          });
        } catch {
          pos = null;
        }
      }

      if (pos) {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        return;
      }

      const pin = await geocodeAddressPin();
      if (pin) {
        setLatitude(pin.lat);
        setLongitude(pin.lng);
        setLocationNote(t(locale, 'locationFromAddress'));
        return;
      }

      setError(t(locale, 'locationUnavailable'));
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as GeolocationPositionError).code === 1
      ) {
        setError(t(locale, 'locationDenied'));
      } else {
        setError(t(locale, 'locationUnavailable'));
      }
    } finally {
      setLocating(false);
    }
  }

  async function onRemoveCover() {
    if (!token || !dealer || !image) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await apiSend(`/api/v1/parts-dealers/id/${dealer.id}/images/${image.id}`, {
        method: 'DELETE',
        token,
      });
      setImage(null);
      setCoverFocusX(50);
      setCoverFocusY(50);
      setDealer({ ...dealer, coverFocusX: 50, coverFocusY: 50 });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'deleteFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDetails(e: FormEvent) {
    e.preventDefault();
    if (!token || !dealer) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const updated = await apiSend<DealerShop>('/api/v1/parts-dealers/mine', {
        method: 'PATCH',
        token,
        body: {
          name: name.trim(),
          description: description.trim() || null,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          districtId,
          cityId,
          latitude,
          longitude,
          facebookUrl: facebookUrl.trim() || null,
          tiktokUrl: tiktokUrl.trim() || null,
        },
      });
      applyDealer(updated);
      setOk(t(locale, 'showroomSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const successPopup =
    mounted && ok && dealer
      ? createPortal(
          <div
            id={dialogId}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="showroom-saved-title"
            tabIndex={-1}
          >
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="h-6 w-6"
                >
                  <path
                    d="M5 12.5 9.5 17 19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                id="showroom-saved-title"
                className="mt-4 font-[family-name:var(--font-display)] text-xl tracking-wide text-foreground"
              >
                {ok}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t(locale, 'viewShowroom')}…
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/${locale}/parts-dealers/${dealer.slug}`)
                  }
                  className="inline-flex justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
                >
                  {t(locale, 'viewShowroom')}
                </button>
                <button
                  type="button"
                  onClick={() => setOk(null)}
                  className="inline-flex justify-center rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-muted transition hover:border-black/25 hover:text-foreground"
                >
                  {t(locale, 'galleryClose')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (!token) {
    return (
      <p className="text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/showroom`)}`}
          className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (dealer === undefined) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-56 animate-pulse rounded-2xl bg-black/[0.06] sm:h-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-black/[0.06]" />
          <div className="h-56 animate-pulse rounded-2xl bg-black/[0.06]" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-black/[0.06]" />
      </div>
    );
  }

  if (!dealer) {
    return (
      <section className={`${cardClass} max-w-xl p-5 sm:p-6`}>
        <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
          {t(locale, 'noActiveShowroom')}
        </p>
        <p className="mt-2 text-sm text-muted">
          {t(locale, 'noActiveShowroomHint')}
        </p>
        <Link
          href={`/${locale}/parts-dealers/apply`}
          className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          {t(locale, 'dealerApply')}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {successPopup}

      {/* Full-width cover banner — matches public showroom framing */}
      <ShowroomCoverEditor
        locale={locale}
        shopName={name || dealer.name}
        showroomHref={`/${locale}/parts-dealers/${dealer.slug}`}
        imageUrl={image?.imageUrl ?? null}
        coverFocusX={coverFocusX}
        coverFocusY={coverFocusY}
        busy={busy}
        onUpload={onUploadCover}
        onRemove={onRemoveCover}
        onSaveFocus={onSaveCoverFocus}
      />

      <form onSubmit={(e) => void onSaveDetails(e)} className="space-y-5">
        {/* Shop + Contact equal columns */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <header className="border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
                {t(locale, 'showroomShopInfo')}
              </h2>
            </header>
            <div className="space-y-4 p-4 sm:p-5">
              <Field label={t(locale, 'shopName')} htmlFor="shop-name">
                <input
                  id="shop-name"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                />
              </Field>
              <Field label={t(locale, 'shopDescription')} htmlFor="shop-desc">
                <textarea
                  id="shop-desc"
                  className={areaClass}
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                />
              </Field>
            </div>
          </section>

          <section className={cardClass}>
            <header className="border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
                {t(locale, 'showroomContact')}
              </h2>
            </header>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label={t(locale, 'phoneLabel')} htmlFor="shop-phone">
                <input
                  id="shop-phone"
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={9}
                  maxLength={20}
                />
              </Field>
              <Field label={t(locale, 'whatsappLabel')} htmlFor="shop-wa">
                <input
                  id="shop-wa"
                  className={fieldClass}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  minLength={9}
                  maxLength={20}
                />
              </Field>
              <Field label={t(locale, 'email')} htmlFor="shop-email">
                <input
                  id="shop-email"
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label={t(locale, 'websiteUrl')} htmlFor="shop-web">
                <input
                  id="shop-web"
                  type="url"
                  className={fieldClass}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Location: map dominant */}
        <section className={cardClass}>
          <header className="border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
              {t(locale, 'showroomLocation')}
            </h2>
          </header>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-4 border-b border-black/[0.06] p-4 sm:p-5 lg:border-r lg:border-b-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t(locale, 'districtLabel')} htmlFor="shop-district">
                  <select
                    id="shop-district"
                    className={fieldClass}
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                      setCityId('');
                    }}
                    required
                  >
                    <option value="">—</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t(locale, 'cityLabel')} htmlFor="shop-city">
                  <select
                    id="shop-city"
                    className={fieldClass}
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    required
                    disabled={!districtId}
                  >
                    <option value="">—</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t(locale, 'addressLabel')} htmlFor="shop-address">
                <input
                  id="shop-address"
                  className={fieldClass}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={300}
                />
              </Field>
              <p className="text-sm text-muted">{t(locale, 'showroomMapHint')}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={() => void fetchLiveLocation()}
                  disabled={locating || busy}
                  className="text-sm font-medium text-accent underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {locating
                    ? t(locale, 'locating')
                    : t(locale, 'fetchLiveLocation')}
                </button>
                {latitude != null && longitude != null ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                      setLocationNote(null);
                    }}
                    className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {t(locale, 'clearMapPin')}
                  </button>
                ) : null}
              </div>
              {locationNote ? (
                <p className="text-sm text-muted">{locationNote}</p>
              ) : null}
            </div>
            <div className="bg-zinc-50 p-3 sm:p-4">
              <DealerMapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                className="h-[16rem] rounded-lg border-black/10 sm:h-[18rem] lg:h-full lg:min-h-[18rem]"
              />
            </div>
          </div>
        </section>

        {/* Social + save */}
        <section className={cardClass}>
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t(locale, 'facebookUrl')} htmlFor="shop-fb">
                <input
                  id="shop-fb"
                  type="url"
                  className={fieldClass}
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/…"
                />
              </Field>
              <Field label={t(locale, 'tiktokUrl')} htmlFor="shop-tt">
                <input
                  id="shop-tt"
                  type="url"
                  className={fieldClass}
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@…"
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving || !districtId || !cityId}
              className="inline-flex h-[46px] items-center justify-center rounded-full bg-accent px-8 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? t(locale, 'saving') : t(locale, 'saveShowroomDetails')}
            </button>
          </div>
          {error ? (
            <p
              className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-5"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </section>
      </form>
    </div>
  );
}

