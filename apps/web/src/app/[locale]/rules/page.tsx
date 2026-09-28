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
  return legalMetadata(locale, 'rules');
}

export default function RulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <LegalDocumentPage params={params} slug="rules" />;
}
