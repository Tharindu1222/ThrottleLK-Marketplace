'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';
import { LoginRequiredDialog } from '@/components/auth-required-link';
import { ListingMessagePopup } from '@/components/listing-message-popup';

type ListingActionItem = {
  id: string;
  slug: string;
  title: string;
  phone?: string | null;
  whatsapp?: string | null;
  seller?: {
    displayName: string;
    avatarUrl?: string | null;
  } | null;
};

function IconTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-30 whitespace-nowrap rounded-sm bg-black/85 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function SvgIcon({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '1.75'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16.5 3.5c-1.74 0-3.41.81-4.5 2.09A6.03 6.03 0 0 0 7.5 3.5 5.5 5.5 0 0 0 2 9c0 6.16 8.5 11.5 10 11.5S22 15.16 22 9a5.5 5.5 0 0 0-5.5-5.5z" />
    </svg>
  );
}

function CompareIcon({ active }: { active: boolean }) {
  return (
    <SvgIcon>
      <path d="M4 6h7M4 12h10M4 18h7" />
      <path
        d={active ? 'M16 8l4 4-4 4M20 12H10' : 'M14 8l4 4-4 4'}
        strokeWidth={active ? '2' : '1.75'}
      />
    </SvgIcon>
  );
}

function PhoneIcon() {
  return (
    <SvgIcon>
      <path d="M22 16.9v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 1h2.2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 8.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.1z" />
    </SvgIcon>
  );
}

function WhatsAppIcon() {
  return (
    <SvgIcon>
      <path d="M20 11.5A8.5 8.5 0 0 1 7.2 19.3L4 20l.8-3.1A8.5 8.5 0 1 1 20 11.5z" />
      <path d="M9.6 8.8c.2-.5.3-.5.6-.5h.5c.2 0 .4.1.5.3l.7 1.6c.1.2 0 .4-.1.6l-.4.5c-.1.1-.1.3 0 .5.4.6 1 1.2 1.6 1.6.2.1.4.1.5 0l.5-.4c.2-.1.4-.2.6-.1l1.6.7c.2.1.3.3.3.5v.5c0 .3 0 .4-.5.6A4.6 4.6 0 0 1 12 16.2 4.6 4.6 0 0 1 9.6 8.8z" />
    </SvgIcon>
  );
}

function MessageIcon() {
  return (
    <SvgIcon>
      <path d="M21 12a8.5 8.5 0 0 1-11.6 7.9L4 21l1.2-4.5A8.5 8.5 0 1 1 21 12z" />
    </SvgIcon>
  );
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '');
  return `https://wa.me/94${digits}`;
}

const iconBtn =
  'peer inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/12 bg-white text-foreground transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';
const iconBtnActive =
  'peer inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent bg-accent/5 text-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';
const contactBtn =
  'inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full px-5 text-[15px] font-medium tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';

export function ListingToolbar({
  locale,
  listing,
}: {
  locale: Locale;
  listing: ListingActionItem;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [favourited, setFavourited] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveLabel = favourited
    ? t(locale, 'unfavourite')
    : t(locale, 'addFavourite');
  const compareLabel = inCompare
    ? t(locale, 'removeCompare')
    : t(locale, 'addCompare');

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    setInCompare(getCompareItems().some((c) => c.id === listing.id));
    if (!access) return;
    void apiGet<string[]>('/api/v1/favourites/ids', { token: access })
      .then((ids) => setFavourited(ids.includes(listing.id)))
      .catch(() => undefined);
  }, [listing.id]);

  async function onFavourite() {
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    setMessage(null);
    try {
      if (favourited) {
        await apiSend(`/api/v1/favourites/${listing.id}`, {
          method: 'DELETE',
          token,
        });
        setFavourited(false);
      } else {
        await apiSend(`/api/v1/favourites/${listing.id}`, { token });
        setFavourited(true);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  }

  function onCompare() {
    const result = toggleCompare({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
    } satisfies CompareItem);
    setInCompare(result.items.some((c) => c.id === listing.id));
    setMessage(result.full ? t(locale, 'compareFull') : null);
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <IconTip label={saveLabel}>
          <button
            type="button"
            onClick={() => void onFavourite()}
            aria-label={saveLabel}
            aria-pressed={favourited}
            title={saveLabel}
            className={favourited ? iconBtnActive : iconBtn}
          >
            <HeartIcon filled={favourited} />
          </button>
        </IconTip>
        <IconTip label={compareLabel}>
          <button
            type="button"
            onClick={onCompare}
            aria-label={compareLabel}
            aria-pressed={inCompare}
            title={compareLabel}
            className={inCompare ? iconBtnActive : iconBtn}
          >
            <CompareIcon active={inCompare} />
          </button>
        </IconTip>
      </div>
      {message ? (
        <p className="max-w-[12rem] text-right text-xs text-muted">{message}</p>
      ) : null}
    </div>
  );
}

export function ListingContactBar({
  locale,
  listing,
}: {
  locale: Locale;
  listing: ListingActionItem;
}) {
  const dialogId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const callNumber = listing.phone?.trim() || null;
  const chatNumber = listing.whatsapp?.trim() || callNumber;
  const sellerName = listing.seller?.displayName || t(locale, 'seller');
  const search = searchParams?.toString();
  const nextPath = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  function onMessageClick() {
    if (!token) {
      setLoginOpen(true);
      return;
    }
    setChatOpen(true);
  }

  const hasCall = Boolean(callNumber);
  const hasChat = Boolean(chatNumber);

  return (
    <div>
      <div
        className={`grid grid-cols-1 gap-2.5 sm:gap-3 ${
          hasCall && hasChat ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {callNumber ? (
          <a
            href={`tel:${callNumber}`}
            className={`${contactBtn} bg-accent text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] hover:brightness-110`}
          >
            <PhoneIcon />
            <span className="truncate">{callNumber}</span>
          </a>
        ) : null}
        {chatNumber ? (
          <a
            href={whatsappHref(chatNumber)}
            target="_blank"
            rel="noreferrer"
            className={`${contactBtn} border border-accent bg-white text-accent hover:bg-accent/5`}
          >
            <WhatsAppIcon />
            <span>{t(locale, 'whatsapp')}</span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={onMessageClick}
          aria-haspopup="dialog"
          aria-expanded={chatOpen || loginOpen}
          aria-controls={chatOpen ? dialogId : undefined}
          className={`${contactBtn} border border-black/12 bg-white text-foreground hover:border-accent hover:text-accent ${
            chatOpen ? 'border-accent text-accent' : ''
          }`}
        >
          <MessageIcon />
          <span>{t(locale, 'sendMessage')}</span>
        </button>
      </div>
      <LoginRequiredDialog
        locale={locale}
        open={loginOpen}
        nextPath={nextPath}
        onClose={() => setLoginOpen(false)}
        title={t(locale, 'loginToMessage')}
        hint={t(locale, 'loginToMessageHint')}
      />
      {chatOpen ? (
        <ListingMessagePopup
          locale={locale}
          dialogId={dialogId}
          listingId={listing.id}
          listingTitle={listing.title}
          sellerName={sellerName}
          sellerAvatarUrl={listing.seller?.avatarUrl}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}
