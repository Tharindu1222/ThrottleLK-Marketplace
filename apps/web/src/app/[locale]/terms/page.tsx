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
  return legalMetadata(locale, 'terms');
}

export default function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <LegalDocumentPage params={params} slug="terms" />;
}
