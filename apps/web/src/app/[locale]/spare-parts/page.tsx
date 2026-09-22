import { redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

/** Legacy URL — unified under /bike-parts?kind=spare */
export default async function SparePartsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/bike-parts?kind=spare');
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set('kind', 'spare');
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string' && key !== 'kind') qs.set(key, value);
  }
  redirect(`/${locale}/bike-parts?${qs.toString()}`);
}
