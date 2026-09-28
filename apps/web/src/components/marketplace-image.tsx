'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';

export function MarketplaceImage({
  src,
  alt,
  className,
  sizes,
  fill = true,
  width,
  height,
  priority,
  fallbackSrc = BRAND_LOGO_SRC,
  fallbackClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  fallbackSrc?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  const imageSrc = showFallback ? fallbackSrc : src;
  const imageClass =
    showFallback && fallbackClassName ? fallbackClassName : className;

  function onError() {
    if (!failed) setFailed(true);
  }

  if (width && height) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={imageClass}
        priority={priority}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={imageClass}
      priority={priority}
      onError={onError}
    />
  );
}
