import { redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

/** Legacy URL — unified under /dealers?type=parts */
export default async function PartsDealersIndexRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/en/dealers?type=parts');
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set('type', 'parts');
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string' && key !== 'type') qs.set(key, value);
  }
  redirect(`/${locale}/dealers?${qs.toString()}`);
}
