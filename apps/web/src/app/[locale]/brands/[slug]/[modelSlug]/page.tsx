import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Model = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brand?: { id: string; name: string; slug: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { locale, slug, modelSlug } = await params;
  try {
    const model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
    const brandName = model.brand?.name ?? slug;
    return pageMetadata({
      title: `${brandName} ${model.name} for sale in Sri Lanka`,
      description: `Find ${brandName} ${model.name} bikes on ThrottleLK — prices, specs, and seller contact.`,
      path: `/${locale}/bikes?brandId=${model.brandId}&modelId=${model.id}`,
    });
  } catch {
    return { title: 'Model not found' };
  }
}

/** Model SEO URLs redirect into the shared bikes browse filters. */
export default async function ModelPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
}) {
  const { locale: raw, slug, modelSlug } = await params;
  if (!isLocale(raw)) notFound();

  let model: Model;
  try {
    model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
  } catch {
    notFound();
  }

  if (model.brand && model.brand.slug !== slug) {
    notFound();
  }

  redirect(
    `/${raw}/bikes?brandId=${model.brandId}&modelId=${model.id}`,
  );
}
