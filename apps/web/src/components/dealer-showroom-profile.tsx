import type { ReactNode } from 'react';
import { DealerMapEmbed } from '@/components/dealer-map-embed';
import { DealerShareButton } from '@/components/dealer-share-button';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import {
  dealerCoverUrl,
  dealerDirectionsHref,
  dealerInitials,
  dealerMemberYear,
  dealerOsmHref,
  dealerWhatsappHref,
  formatDealerLocation,
  formatStreetAddress,
  type DealerShowroom,
} from '@/lib/dealer-showroom';
import { t, type Locale } from '@/lib/i18n';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2';

const ACTION = `inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition sm:w-auto ${FOCUS}`;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-4 w-4 shrink-0"
    >
      {children}
    </svg>
  );
}

function PinIcon() {
  return (
    <Icon>
      <path
        d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </Icon>
  );
}

export function DealerShowroomProfile({
  locale,
  dealer,
  countLabel,
  eyebrow,
}: {
  locale: Locale;
  dealer: DealerShowroom;
  countLabel: string;
  eyebrow: string;
}) {
  const cover = dealerCoverUrl(dealer);
  const location = formatDealerLocation(dealer);
  const address = dealer.address ? formatStreetAddress(dealer.address) : '';
  const initials = dealerInitials(dealer.ownerDisplayName || dealer.name);
  const whatsappHref = dealerWhatsappHref(dealer.whatsapp);
  const directionsHref = dealerDirectionsHref(dealer, location);
  const memberYear = dealerMemberYear(dealer.createdAt);
  const facts = [
    location,
    countLabel,
    memberYear
      ? t(locale, 'memberSince').replace('{year}', String(memberYear))
      : null,
  ].filter(Boolean);

  const contacts: {
    key: string;
    href: string;
    label: string;
    value: string;
    external?: boolean;
  }[] = [];
  if (dealer.email) {
    contacts.push({
      key: 'email',
      href: `mailto:${dealer.email}`,
      label: t(locale, 'email'),
      value: dealer.email,
    });
  }
  if (dealer.website) {
    contacts.push({
      key: 'website',
      href: dealer.website,
      label: t(locale, 'websiteUrl'),
      value: dealer.website.replace(/^https?:\/\//, ''),
      external: true,
    });
  }
  if (dealer.facebookUrl) {
    contacts.push({
      key: 'facebook',
      href: dealer.facebookUrl,
      label: t(locale, 'socialFacebook'),
      value: t(locale, 'visitFacebook'),
      external: true,
    });
  }
  if (dealer.tiktokUrl) {
    contacts.push({
      key: 'tiktok',
      href: dealer.tiktokUrl,
      label: t(locale, 'socialTiktok'),
      value: t(locale, 'visitTiktok'),
      external: true,
    });
  }

  const hasMap = dealer.latitude != null && dealer.longitude != null;
  const hasVisit = Boolean(address || contacts.length || hasMap);

  return (
    <article>
      <div className="relative isolate h-[50dvh] min-h-48 overflow-hidden bg-zinc-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#111_0%,#333_50%,#e10600_160%)]" />
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div
          className={`relative -mt-8 rounded-2xl bg-white px-5 shadow-[0_1px_0_rgba(0,0,0,0.06),0_20px_48px_-18px_rgba(15,15,15,0.28)] ring-1 ring-black/10 sm:-mt-10 sm:px-6 ${hasVisit ? 'pb-0' : 'pb-5'}`}
        >
        <header className="flex flex-col items-center text-center">
          <div className="relative -mt-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full bg-zinc-200 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] ring-[3px] ring-white sm:-mt-12 sm:h-20 sm:w-20">
            {dealer.ownerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dealer.ownerAvatarUrl}
                alt={dealer.ownerDisplayName || dealer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-foreground font-[family-name:var(--font-display)] text-lg text-white">
                {initials || '?'}
              </div>
            )}
          </div>

          <p
            className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
              dealer.verifiedAt
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-accent/10 text-accent'
            }`}
          >
            {eyebrow}
          </p>
          <div className="mt-1.5 flex max-w-xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <h1 className="text-balance font-[family-name:var(--font-display)] text-xl leading-tight tracking-tight break-words text-foreground sm:text-2xl">
              {dealer.name}
            </h1>
            {dealer.verifiedAt ? (
              <VerifiedDealerBadge locale={locale} />
            ) : null}
          </div>

          {facts.length > 0 ? (
            <p className="mt-1.5 max-w-xl text-sm leading-snug text-muted">
              {facts.join(' · ')}
            </p>
          ) : null}

          {dealer.description ? (
            <p className="mt-1.5 line-clamp-2 max-w-xl text-sm leading-relaxed break-words text-muted">
              {dealer.description}
            </p>
          ) : null}

          <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 sm:flex sm:max-w-xl sm:flex-wrap sm:justify-center">
            <a
              href={`tel:${dealer.phone}`}
              aria-label={`${t(locale, 'phoneLabel')}: ${dealer.phone}`}
              className={`${ACTION} bg-accent text-white hover:bg-accent/90`}
            >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
              <path
                d="M6.5 4.5h3l1.2 3.2-1.6 1.1a12 12 0 0 0 5.1 5.1l1.1-1.6 3.2 1.2v3A1.5 1.5 0 0 1 17 18 13.5 13.5 0 0 1 3.5 4.5 1.5 1.5 0 0 1 5 3h1.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate">{dealer.phone}</span>
          </a>
          {whatsappHref && dealer.whatsapp ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t(locale, 'whatsapp')}: ${dealer.whatsapp}`}
              className={`${ACTION} bg-[#25D366] text-white hover:bg-[#1ebe57]`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="h-4 w-4"
              >
                <path d="M12.04 2.5A9.5 9.5 0 0 0 3.4 16.3L2.5 21.5l5.3-.9A9.5 9.5 0 1 0 12.04 2.5Zm5.5 13.5c-.23.65-1.33 1.2-1.85 1.28-.47.07-1.07.1-1.73-.11-.4-.12-.91-.3-1.57-.59-2.76-1.2-4.56-3.98-4.7-4.16-.13-.18-1.1-1.46-1.1-2.79 0-1.32.69-1.97.94-2.24.25-.27.54-.34.72-.34h.52c.17 0 .4-.06.62.47.23.55.77 1.9.84 2.03.07.14.12.3 0 .48-.1.18-.16.3-.32.46-.16.16-.33.35-.48.47-.16.13-.33.28-.14.55.18.27.82 1.35 1.76 2.18 1.21 1.07 2.23 1.4 2.54 1.56.32.16.5.13.69-.08.18-.2.79-.92 1-.1.23.24.23 1.37.02 1.66Z" />
              </svg>
              <span className="truncate">{dealer.whatsapp}</span>
            </a>
          ) : null}
          {directionsHref ? (
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              className={`${ACTION} bg-white text-foreground ring-1 ring-black/10 hover:text-accent hover:ring-accent/30`}
            >
              <span className="text-accent">
                <PinIcon />
              </span>
              {t(locale, 'getDirections')}
            </a>
          ) : null}
          <DealerShareButton
            label={t(locale, 'shareShowroom')}
            copiedLabel={t(locale, 'linkCopied')}
            title={dealer.name}
            className={`${ACTION} bg-white text-foreground ring-1 ring-black/10 hover:text-accent hover:ring-accent/30`}
          />
          </div>
        </header>

      {hasVisit ? (
        <section
          aria-labelledby="showroom-visit"
          className="-mx-5 mt-4 overflow-hidden rounded-b-2xl border-t border-black/10 sm:-mx-6"
        >
          <h2 id="showroom-visit" className="sr-only">
            {t(locale, 'showroomVisit')}
          </h2>
          <div
            className={`grid items-start ${hasMap ? 'lg:grid-cols-2 lg:items-stretch' : ''}`}
          >
            <div className="px-5 py-3 sm:px-6">
              {address ? (
                <p className="mb-2 flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-accent" aria-hidden>
                    <PinIcon />
                  </span>
                  <span className="min-w-0 break-words">{address}</span>
                </p>
              ) : null}

              {contacts.length > 0 ? (
                <ul className="divide-y divide-black/10">
                  {contacts.map((link) => (
                    <li key={link.key}>
                      <a
                        href={link.href}
                        {...(link.external
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                        className={`group flex min-h-10 items-center gap-2.5 py-2 ${FOCUS}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                          <ContactIcon kind={link.key} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="sr-only">{link.label}: </span>
                          <span className="block truncate text-sm font-medium text-foreground group-hover:text-accent">
                            {link.value}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {hasMap ? (
              <div
                className="relative h-40 border-t border-black/10 sm:h-48 lg:h-auto lg:min-h-52 lg:border-t-0 lg:border-l"
                role="region"
                aria-label={t(locale, 'mapLocation')}
              >
                <a
                  href={dealerOsmHref(dealer.latitude!, dealer.longitude!)}
                  target="_blank"
                  rel="noreferrer"
                  className={`absolute top-2 right-2 z-[1] rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-black/10 hover:underline ${FOCUS}`}
                >
                  {t(locale, 'openInMaps')}
                </a>
                <DealerMapEmbed
                  latitude={dealer.latitude!}
                  longitude={dealer.longitude!}
                  className="absolute inset-0 h-full w-full border-0 bg-zinc-100"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
        </div>
      </div>
    </article>
  );
}

function ContactIcon({ kind }: { kind: string }) {
  if (kind === 'email') {
    return (
      <Icon>
        <rect
          x="3.5"
          y="6"
          width="17"
          height="12"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="m4.5 7.5 7.5 6 7.5-6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
    );
  }
  if (kind === 'website') {
    return (
      <Icon>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M4.5 12h15M12 4.5c2.2 2.4 3.3 4.9 3.3 7.5S14.2 17.1 12 19.5C9.8 17.1 8.7 14.6 8.7 12S9.8 6.9 12 4.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </Icon>
    );
  }
  if (kind === 'facebook') {
    return (
      <Icon>
        <path
          d="M14 8.5h2.5V5.8H14c-2.1 0-3.5 1.3-3.5 3.5V11H8.5v2.7H10.5V19H13.5v-5.3H16l.5-2.7h-3V9.4c0-.5.3-.9.9-.9Z"
          fill="currentColor"
          stroke="none"
        />
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </Icon>
    );
  }
  return (
    <Icon>
      <path
        d="M14 5.5c.6 1.8 2 3.1 3.8 3.5v2.4c-1.3-.1-2.5-.6-3.5-1.4v5.3a4.7 4.7 0 1 1-4.7-4.7c.3 0 .5 0 .8.1v2.5a2.2 2.2 0 1 0 1.5 2.1V5.5H14Z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}
