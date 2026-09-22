import { redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

/** Kept for old bookmarks — list-a-part lives under account with sidebar. */
export default async function ListPartRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect('/en/account/parts-listings/new');
  redirect(`/${raw}/account/parts-listings/new`);
}
