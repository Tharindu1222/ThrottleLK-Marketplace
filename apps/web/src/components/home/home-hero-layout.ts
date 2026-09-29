import type { Locale } from '@/lib/i18n';

export function homeHeroSectionClass() {
  return 'relative isolate w-full bg-[#090909]';
}

export function homeHeroHeadingClass(locale: Locale) {
  const wrap =
    'mt-3 w-full min-w-0 font-semibold text-white break-words [overflow-wrap:anywhere]';
  if (locale === 'si') {
    return `${wrap} font-[family-name:var(--font-si)] text-[2.15rem] leading-snug sm:text-5xl lg:text-6xl`;
  }
  return `${wrap} font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.12] sm:text-5xl lg:text-[4.6rem] xl:text-[5rem]`;
}

export function homeHeroSupportClass() {
  return 'mt-5 w-full min-w-0 max-w-full text-pretty text-base leading-relaxed text-white/70 sm:max-w-lg sm:text-lg';
}
