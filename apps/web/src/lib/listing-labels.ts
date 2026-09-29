import { t, type Locale } from '@/lib/i18n';

const CONDITION_KEYS = {
  new: 'conditionNew',
  used: 'conditionUsed',
  reconditioned: 'conditionReconditioned',
} as const;

const FUEL_KEYS = {
  petrol: 'fuelPetrol',
  diesel: 'fuelDiesel',
  electric: 'fuelElectric',
  hybrid: 'fuelHybrid',
  other: 'fuelOther',
} as const;

const TRANSMISSION_KEYS = {
  manual: 'transmissionManual',
  automatic: 'transmissionAutomatic',
  semi_automatic: 'transmissionSemi',
} as const;

function prettyFallback(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalize(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function listingConditionLabel(
  locale: Locale,
  value: string | null | undefined,
) {
  const raw = normalize(value);
  if (!raw) return '';
  const key = CONDITION_KEYS[raw as keyof typeof CONDITION_KEYS];
  return key ? t(locale, key) : prettyFallback(raw);
}

export function listingFuelLabel(
  locale: Locale,
  value: string | null | undefined,
) {
  const raw = normalize(value);
  if (!raw) return '';
  const key = FUEL_KEYS[raw as keyof typeof FUEL_KEYS];
  return key ? t(locale, key) : prettyFallback(raw);
}

export function listingTransmissionLabel(
  locale: Locale,
  value: string | null | undefined,
) {
  const raw = normalize(value);
  if (!raw) return '';
  const key = TRANSMISSION_KEYS[raw as keyof typeof TRANSMISSION_KEYS];
  return key ? t(locale, key) : prettyFallback(raw);
}

export function listingDateLocale(locale: Locale) {
  return locale === 'si' ? 'si-LK' : 'en-LK';
}
