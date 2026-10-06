'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LoginRequiredDialog } from '@/components/auth-required-link';
import { ListingMessagePopup } from '@/components/listing-message-popup';
import { FavouriteHeart } from '@/components/part-card';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { recordContactClick } from '@/lib/record-contact-click';
import { whatsappHref } from '@/lib/whatsapp';

export function PartContactBar({
  locale,
  partId,
  partSlug,
  partKind,
  title,
  phone,
  whatsapp,
  sellerName,
}: {
  locale: Locale;
  partId: string;
  partSlug: string;
  partKind: string;
  title: string;
  phone: string | null;
  whatsapp: string | null;
  sellerName: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const waHref = whatsapp ? whatsappHref(whatsapp) : null;
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
    setMessageOpen(true);
  }
  return (
    <section className="space-y-3 rounded-xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="break-words font-[family-name:var(--font-display)] text-xl tracking-wide">
          {t(locale, 'contactSeller')}
        </h2>
        <FavouriteHeart
          locale={locale}
          partListingId={partId}
          partSlug={partSlug}
          partKind={partKind}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={() => recordContactClick(partId, 'phone', 'part')}
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center break-all rounded-full bg-accent px-5 text-center text-sm font-semibold text-white sm:w-auto"
          >
            {t(locale, 'call')} · {phone}
          </a>
        ) : null}
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => recordContactClick(partId, 'whatsapp', 'part')}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white sm:w-auto"
          >
            {t(locale, 'whatsapp')}
          </a>
        ) : null}
        <button
          type="button"
          onClick={onMessageClick}
          aria-haspopup="dialog"
          aria-expanded={messageOpen || loginOpen}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-black/15 px-5 text-sm font-semibold text-foreground sm:w-auto"
        >
          {t(locale, 'sendMessage')}
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
      {messageOpen ? (
        <ListingMessagePopup
          locale={locale}
          partListingId={partId}
          listingTitle={title}
          sellerName={sellerName}
          onClose={() => setMessageOpen(false)}
        />
      ) : null}
    </section>
  );
}
