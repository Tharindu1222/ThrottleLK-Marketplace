import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type District = { id: string; name: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
    return pageMetadata({
      title: `Motorcycles for sale in ${district.name}`,
      description: `Browse bikes and scooters listed in ${district.name} on ThrottleLK.`,
      path: `/${locale}/bikes?districtId=${district.id}`,
    });
  } catch {
    return { title: 'Location not found' };
  }
}

/** District SEO URLs redirect into the shared bikes browse filters. */
export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();

  let district: District;
  try {
    district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
  } catch {
    notFound();
  }

  redirect(`/${raw}/bikes?districtId=${district.id}`);
}
