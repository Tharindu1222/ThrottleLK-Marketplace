export const BRAND_LOGO_SRC = '/images/brand/throttlelk-logo.png';
export const BRAND_LOGO_ALT = 'Throttle LK Motowear';

type BrandLogoProps = {
  className?: string;
  /** Header / footer size presets */
  size?: 'header' | 'footer' | 'admin';
};

const sizeClass: Record<NonNullable<BrandLogoProps['size']>, string> = {
  header: 'h-9 w-auto sm:h-10',
  footer: 'mx-auto h-12 w-auto',
  admin: 'h-8 w-auto',
};

export function BrandLogo({ className, size = 'header' }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      className={`${sizeClass[size]} object-contain object-left ${className ?? ''}`}
    />
  );
}
