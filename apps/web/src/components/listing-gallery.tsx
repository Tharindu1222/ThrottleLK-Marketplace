'use client';

import { useMemo, useState } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { t, type Locale } from '@/lib/i18n';

type GalleryImage = {
  id: string;
  imageUrl: string;
  isCover: boolean;
};

export function ListingGallery({
  locale,
  title,
  coverImageUrl,
  images = [],
}: {
  locale: Locale;
  title: string;
  coverImageUrl?: string | null;
  images?: GalleryImage[];
}) {
  const ordered = useMemo(() => {
    const list = [...images];
    list.sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return 0;
    });
    return list;
  }, [images]);

  const fallback = coverImageUrl ?? ordered[0]?.imageUrl ?? null;
  const [activeUrl, setActiveUrl] = useState<string | null>(fallback);

  const current = activeUrl ?? fallback;

  if (!current) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 border border-black/10 bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)] shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          className="h-12 w-auto max-w-[40%] object-contain opacity-80 brightness-0"
        />
        <span className="text-sm text-muted">{t(locale, 'photoComingSoon')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden border border-black/10 bg-zinc-100 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={title}
          className="aspect-[16/10] w-full object-cover"
        />
      </div>
      {ordered.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {ordered.map((image, index) => {
            const selected = image.imageUrl === current;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveUrl(image.imageUrl)}
                aria-label={`Photo ${index + 1} of ${ordered.length}`}
                aria-pressed={selected}
                className={`overflow-hidden border bg-surface transition ${
                  selected
                    ? 'border-accent ring-2 ring-accent/30'
                    : 'border-black/10 hover:border-accent/50'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-20 object-cover sm:h-[4.5rem] sm:w-24"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
