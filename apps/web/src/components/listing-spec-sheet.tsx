import type { ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n';

export type ListingSpecs = {
  brandName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  manufactureYear: number;
  registrationYear?: number | null;
  mileage: number | null;
  engineCc: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  colour?: string | null;
  negotiable?: boolean;
  sellerType?: 'dealer' | 'private' | string | null;
  listedAt?: string | null;
  viewCount?: number;
};

function pretty(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const icons = {
  brand: (
    <Icon>
      <path d="M20.6 13.4 12.7 21.3a2 2 0 0 1-2.8 0L3 14.4V4h10.4l7.2 7.2a2 2 0 0 1 0 2.2z" />
      <circle cx="8.2" cy="8.2" r="1.2" />
    </Icon>
  ),
  model: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7.05 7.05 5.6 5.6M18.4 18.4l-1.45-1.45M7.05 16.95 5.6 18.4M18.4 5.6l-1.45 1.45" />
    </Icon>
  ),
  category: (
    <Icon>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </Icon>
  ),
  year: (
    <Icon>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </Icon>
  ),
  mileage: (
    <Icon>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l4-4" />
      <path d="M7 8.5a8 8 0 0 1 10 0" />
    </Icon>
  ),
  engine: (
    <Icon>
      <path d="M7 8h10l1.5 4H18v5H6v-5h-.5L7 8z" />
      <path d="M9 8V6h6v2" />
      <path d="M10 17v2M14 17v2" />
    </Icon>
  ),
  fuel: (
    <Icon>
      <path d="M8 4h6l2 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M14 8h3.5a2 2 0 0 1 2 2v5.5a1.5 1.5 0 1 0 3 0V11l-2-2" />
    </Icon>
  ),
  transmission: (
    <Icon>
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <path d="M7 9.2v2.3h10V9.2M12 14.8v-3.3" />
    </Icon>
  ),
  condition: (
    <Icon>
      <rect x="6" y="7" width="12" height="14" rx="2" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      <path d="M9.5 14.5 11 16l3.5-3.5" />
    </Icon>
  ),
  colour: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16" />
      <path d="M12 12h8" />
    </Icon>
  ),
  location: (
    <Icon>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </Icon>
  ),
  seller: (
    <Icon>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5c.8-3.4 3.4-5 7-5s6.2 1.6 7 5" />
    </Icon>
  ),
  negotiable: (
    <Icon>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c-.6-1.5-2-2.5-4.5-2.5-2.8 0-4.5 1.5-4.5 3.4 0 4.6 9 2.2 9 6.6 0 2-1.8 3.5-4.6 3.5-2.6 0-4.2-1.1-4.8-2.7" />
    </Icon>
  ),
  listed: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </Icon>
  ),
};

function formatListedAt(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );

  if (diffDays <= 0) return t(locale, 'postedToday');
  if (diffDays === 1) return t(locale, 'postedYesterday');
  if (diffDays < 7) {
    return t(locale, 'postedDaysAgo').replace('{n}', String(diffDays));
  }

  const formatted = date.toLocaleDateString(
    locale === 'si' ? 'si-LK' : 'en-LK',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
  return t(locale, 'postedOn').replace('{date}', formatted);
}

export function listingLocation(listing: ListingSpecs): string | null {
  const city = listing.cityName?.trim();
  const district = listing.districtName?.trim();
  if (city && district && city.toLowerCase() !== district.toLowerCase()) {
    return `${city}, ${district}`;
  }
  return city || district || null;
}

export function ListingSpecSheet({
  locale,
  listing,
}: {
  locale: Locale;
  listing: ListingSpecs;
}) {
  const listed =
    listing.listedAt ? formatListedAt(listing.listedAt, locale) : '';
  const views =
    listing.viewCount != null && listing.viewCount > 0
      ? listing.viewCount === 1
        ? t(locale, 'viewsOne')
        : t(locale, 'views').replace(
            '{n}',
            listing.viewCount.toLocaleString('en-LK'),
          )
      : null;

  const rows: { key: string; icon: ReactNode; label: string; value: string }[] =
    [];

  const push = (
    key: string,
    icon: ReactNode,
    label: string,
    value: string | null | undefined,
  ) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    rows.push({ key, icon, label, value: trimmed });
  };

  push('brand', icons.brand, t(locale, 'brandFilter'), listing.brandName);
  push('model', icons.model, t(locale, 'modelFilter'), listing.modelName);
  push(
    'category',
    icons.category,
    t(locale, 'categoryFilter'),
    listing.categoryName,
  );
  push('year', icons.year, t(locale, 'year'), String(listing.manufactureYear));
  push(
    'registered',
    icons.year,
    t(locale, 'registrationYear'),
    listing.registrationYear != null
      ? String(listing.registrationYear)
      : null,
  );
  push(
    'mileage',
    icons.mileage,
    t(locale, 'mileage'),
    listing.mileage != null
      ? `${listing.mileage.toLocaleString('en-LK')} km`
      : null,
  );
  push(
    'engine',
    icons.engine,
    t(locale, 'cc'),
    listing.engineCc != null ? `${listing.engineCc} cc` : null,
  );
  push('fuel', icons.fuel, t(locale, 'fuel'), pretty(listing.fuelType));
  push(
    'gear',
    icons.transmission,
    t(locale, 'transmission'),
    pretty(listing.transmission),
  );
  push(
    'condition',
    icons.condition,
    t(locale, 'condition'),
    pretty(listing.condition),
  );
  push('colour', icons.colour, t(locale, 'colour'), listing.colour);

  return (
    <section
      aria-labelledby="listing-overview-heading"
      className="flex h-full min-h-0 flex-col border border-black/10 bg-white"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-5">
        <h2
          id="listing-overview-heading"
          className="font-[family-name:var(--font-display)] text-xl tracking-wide text-foreground sm:text-2xl"
        >
          {t(locale, 'listingDetails')}
        </h2>
        {views ? <p className="shrink-0 text-sm text-muted">{views}</p> : null}
      </div>
      <dl className="flex flex-1 flex-col">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-2.5 last:border-b-0 sm:px-5"
          >
            <dt className="flex min-w-0 items-center gap-2.5 text-[13px] text-muted">
              <span className="text-foreground/55">{row.icon}</span>
              <span>{row.label}</span>
            </dt>
            <dd className="max-w-[58%] text-right text-[14px] font-medium leading-snug text-foreground sm:text-[15px]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {listed ? (
        <p className="mt-auto border-t border-black/10 px-4 py-2.5 text-sm text-muted sm:px-5">
          {t(locale, 'listed')}: {listed}
        </p>
      ) : null}
    </section>
  );
}

export function LocationPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}
