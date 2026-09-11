import { notFound } from 'next/navigation';

const locales = ['en', 'si'] as const;
type Locale = (typeof locales)[number];

const copy: Record<
  Locale,
  { tagline: string; support: string; cta: string }
> = {
  en: {
    tagline: 'Motorcycles & scooters for Sri Lanka',
    support: 'Buy and sell with bike-native search — private sellers and dealers.',
    cta: 'Browse bikes soon',
  },
  si: {
    tagline: 'ශ්‍රී ලංකාව සඳහා යතුරුපැදි සහ ස්කූටර්',
    support: 'පුද්ගලික විකුණුම්කරුවන් සහ ඩීලර්වරුන්ගෙන් සොයන්න, ලැයිස්තුගත කරන්න.',
    cta: 'ඉක්මනින් බලන්න',
  },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!locales.includes(raw as Locale)) {
    notFound();
  }
  const locale = raw as Locale;
  const t = copy[locale];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(242,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,230,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 font-[family-name:var(--font-display)] text-sm tracking-[0.35em] text-accent uppercase">
          Sri Lanka
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight text-foreground sm:text-8xl">
          ThrottleLK
        </h1>
        <p className="mt-6 max-w-xl text-xl text-foreground/90 sm:text-2xl">
          {t.tagline}
        </p>
        <p className="mt-3 max-w-lg text-base text-muted">{t.support}</p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center bg-accent px-5 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-background">
            {t.cta}
          </span>
          <a
            href={locale === 'en' ? '/si' : '/en'}
            className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {locale === 'en' ? 'සිංහල' : 'English'}
          </a>
        </div>
      </div>
    </main>
  );
}
