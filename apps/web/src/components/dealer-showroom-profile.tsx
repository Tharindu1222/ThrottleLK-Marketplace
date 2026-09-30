import type { ReactNode } from 'react';
import { DealerMapEmbed } from '@/components/dealer-map-embed';
import { DealerShareButton } from '@/components/dealer-share-button';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import { coverObjectPosition } from '@/lib/cover-crop';
import {
  dealerCoverUrl,
  dealerDirectionsHref,
  dealerInitials,
  dealerMemberYear,
  dealerOsmHref,
  dealerWhatsappHref,
  formatDealerLocation,
  formatStreetAddress,
  safeHttpUrl,
  type DealerShowroom,
} from '@/lib/dealer-showroom';
import { t, type Locale } from '@/lib/i18n';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2';

const ACTION = `inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-3.5 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide transition ${FOCUS}`;

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
  const coverPosition = coverObjectPosition(
    dealer.coverFocusX,
    dealer.coverFocusY,
  );
  const location = formatDealerLocation(dealer);
  const address = dealer.address ? formatStreetAddress(dealer.address) : '';
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
  const website = safeHttpUrl(dealer.website);
  if (website) {
    contacts.push({
      key: 'website',
      href: website,
      label: t(locale, 'websiteUrl'),
      value: website.replace(/^https?:\/\//, ''),
      external: true,
    });
  }
  const facebook = safeHttpUrl(dealer.facebookUrl);
  if (facebook) {
    contacts.push({
      key: 'facebook',
      href: facebook,
      label: t(locale, 'socialFacebook'),
      value: t(locale, 'visitFacebook'),
      external: true,
    });
  }
  const tiktok = safeHttpUrl(dealer.tiktokUrl);
  if (tiktok) {
    contacts.push({
      key: 'tiktok',
      href: tiktok,
      label: t(locale, 'socialTiktok'),
      value: t(locale, 'visitTiktok'),
      external: true,
    });
  }

  const hasMap = dealer.latitude != null && dealer.longitude != null;
  const ownerName = dealer.ownerDisplayName?.trim() || null;
  const showOwnerChip = Boolean(ownerName || dealer.ownerAvatarUrl);
  const hasContacts = Boolean(address || contacts.length);
  const shopMark = dealerInitials(dealer.name) || '?';
  const ownerInitials = dealerInitials(dealer.ownerDisplayName || dealer.name);

  return (
    <article>
      <div className="relative isolate h-[38dvh] min-h-44 max-h-72 overflow-hidden bg-zinc-200 sm:h-[42dvh]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: coverPosition }}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#111_0%,#333_50%,#e10600_160%)]" />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 via-black/20 to-transparent"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="relative -mt-10 overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-[#f4f4f4]/82 to-white/75 shadow-[0_8px_40px_-12px_rgba(15,15,15,0.18),0_24px_56px_-28px_rgba(15,15,15,0.22)] ring-1 ring-black/10 backdrop-blur-2xl backdrop-saturate-150 sm:-mt-12 supports-[backdrop-filter]:bg-[#f4f4f4]/55">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(15,15,15,0.05),transparent_55%)]"
          />
          <div
            className={`relative grid ${hasMap ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-stretch' : ''}`}
          >
            <div className="flex min-w-0 flex-col space-y-5 px-4 py-5 sm:px-6 sm:py-6">
              <header className="flex items-start gap-4 text-left">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-[family-name:var(--font-display)] text-xl tracking-wide text-white shadow-[0_12px_28px_-14px_rgba(15,15,15,0.45)] ring-1 ring-white/40 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-2xl ${
                    dealer.verifiedAt ? 'bg-accent' : 'bg-foreground'
                  }`}
                  aria-hidden
                >
                  {shopMark}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.14em] uppercase backdrop-blur-sm ${
                      dealer.verifiedAt
                        ? 'bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-200/60'
                        : 'bg-black/[0.06] text-foreground ring-1 ring-black/10'
                    }`}
                  >
                    {eyebrow}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h1 className="text-balance font-[family-name:var(--font-display)] text-2xl leading-[0.95] tracking-tight break-words text-foreground sm:text-3xl">
                      {dealer.name}
                    </h1>
                    {dealer.verifiedAt ? (
                      <VerifiedDealerBadge locale={locale} />
                    ) : null}
                  </div>

                  {facts.length > 0 ? (
                    <p className="mt-1.5 text-sm leading-snug text-muted">
                      {facts.join(' · ')}
                    </p>
                  ) : null}

                  {showOwnerChip ? (
                    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/50 px-2.5 py-1 ring-1 ring-black/10 backdrop-blur-md">
                      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-white/70">
                        {dealer.ownerAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={dealer.ownerAvatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-foreground text-[9px] font-semibold text-white">
                            {ownerInitials || '?'}
                          </span>
                        )}
                      </span>
                      <p className="min-w-0 truncate text-sm leading-none">
                        <span className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
                          {t(locale, 'showroomOwner')}
                        </span>
                        {ownerName ? (
                          <span className="text-foreground">
                            {' · '}
                            <span className="font-medium">{ownerName}</span>
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ) : null}

                  {dealer.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed break-words text-muted">
                      {dealer.description}
                    </p>
                  ) : null}
                </div>
              </header>

              <div className="grid w-full grid-cols-2 gap-2.5">
                <a
                  href={`tel:${dealer.phone}`}
                  aria-label={`${t(locale, 'phoneLabel')}: ${dealer.phone}`}
                  title={dealer.phone}
                  className={`${ACTION} bg-accent text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] hover:brightness-110`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="h-4 w-4"
                  >
                    <path
                      d="M6.5 4.5h3l1.2 3.2-1.6 1.1a12 12 0 0 0 5.1 5.1l1.1-1.6 3.2 1.2v3A1.5 1.5 0 0 1 17 18 13.5 13.5 0 0 1 3.5 4.5 1.5 1.5 0 0 1 5 3h1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{t(locale, 'call')}</span>
                </a>
                {whatsappHref && dealer.whatsapp ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${t(locale, 'whatsapp')}: ${dealer.whatsapp}`}
                    title={dealer.whatsapp}
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
                    <span>{t(locale, 'whatsapp')}</span>
                  </a>
                ) : null}
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ACTION} bg-white/60 text-foreground ring-1 ring-black/10 backdrop-blur-md hover:bg-white/80 hover:text-accent hover:ring-black/15`}
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
                  className={`${ACTION} bg-white/60 text-foreground ring-1 ring-black/10 backdrop-blur-md hover:bg-white/80 hover:text-accent hover:ring-black/15`}
                />
              </div>

              {hasContacts ? (
                <div className="border-t border-black/10 pt-5">
                  <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
                    {t(locale, 'showroomVisit')}
                  </h2>
                  {address ? (
                    <p className="mt-3 flex items-start gap-2.5 text-sm font-medium text-foreground">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-accent ring-1 ring-black/10 backdrop-blur-sm"
                        aria-hidden
                      >
                        <PinIcon />
                      </span>
                      <span className="min-w-0 pt-1.5 break-words">
                        {address}
                      </span>
                    </p>
                  ) : null}
                  {contacts.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {contacts.map((link) => (
                        <li key={link.key}>
                          <a
                            href={link.href}
                            {...(link.external
                              ? { target: '_blank', rel: 'noreferrer' }
                              : {})}
                            className={`group flex min-h-10 items-center gap-3 rounded-xl px-1 py-1.5 -mx-1 hover:bg-black/[0.04] ${FOCUS}`}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-accent ring-1 ring-black/10 backdrop-blur-sm">
                              <ContactIcon kind={link.key} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
                                {link.label}
                              </span>
                              <span className="block truncate text-sm text-foreground group-hover:text-accent">
                                {link.value}
                              </span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            {hasMap ? (
              <div
                className="relative h-[50vh] min-h-[240px] w-full min-w-0 max-w-full overflow-hidden border-t border-black/10 lg:h-auto lg:min-h-full lg:border-t-0 lg:border-l lg:border-black/10"
                role="region"
                aria-label={t(locale, 'mapLocation')}
              >
                <a
                  href={dealerOsmHref(dealer.latitude!, dealer.longitude!)}
                  target="_blank"
                  rel="noreferrer"
                  className={`absolute top-2.5 right-2.5 z-[1] rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-black/10 backdrop-blur-md hover:bg-white/95 hover:underline ${FOCUS}`}
                >
                  {t(locale, 'openInMaps')}
                </a>
                <DealerMapEmbed
                  latitude={dealer.latitude!}
                  longitude={dealer.longitude!}
                  className="absolute inset-0 h-full w-full border-0 bg-zinc-100/80"
                />
              </div>
            ) : null}
          </div>
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
