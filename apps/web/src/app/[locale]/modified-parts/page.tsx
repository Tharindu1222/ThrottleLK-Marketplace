import { redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

/** Legacy URL — unified under /bike-parts?kind=modified */
export default async function ModifiedPartsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/bike-parts?kind=modified');
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set('kind', 'modified');
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string' && key !== 'kind') qs.set(key, value);
  }
  redirect(`/${locale}/bike-parts?${qs.toString()}`);
}
