import type { Metadata } from 'next';
import {
  LegalDocumentPage,
  legalMetadata,
} from '@/components/legal-document-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata(locale, 'privacy');
}

export default function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <LegalDocumentPage params={params} slug="privacy" />;
}
