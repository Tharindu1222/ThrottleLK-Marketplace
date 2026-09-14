export const BRAND_LOGO_SRC = '/images/brand/throttlelk-logo.png';
export const BRAND_LOGO_ALT = 'Throttle LK Motowear';

type BrandLogoProps = {
  className?: string;
  /** Header / footer size presets */
  size?: 'header' | 'footer' | 'admin';
  /** Logo artwork is white; use black on light surfaces */
  tone?: 'black' | 'white';
};

const sizeClass: Record<NonNullable<BrandLogoProps['size']>, string> = {
  header: 'h-9 w-auto sm:h-10',
  footer: 'mx-auto h-12 w-auto',
  admin: 'h-8 w-auto',
};

const toneClass: Record<NonNullable<BrandLogoProps['tone']>, string> = {
  black: 'brightness-0',
  white: '',
};

export function BrandLogo({
  className,
  size = 'header',
  tone = 'black',
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      className={`${sizeClass[size]} ${toneClass[tone]} object-contain object-left ${className ?? ''}`}
    />
  );
}
