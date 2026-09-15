import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Brand = { id: string; name: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
    return pageMetadata({
      title: `${brand.name} motorcycles for sale in Sri Lanka`,
      description: `Browse used and new ${brand.name} bikes and scooters on ThrottleLK.`,
      path: `/${locale}/bikes?brandId=${brand.id}`,
    });
  } catch {
    return { title: 'Brand not found' };
  }
}

/** Brand SEO URLs redirect into the shared bikes browse filters. */
export default async function BrandPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();

  let brand: Brand;
  try {
    brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
  } catch {
    notFound();
  }

  redirect(`/${raw}/bikes?brandId=${brand.id}`);
}
