export type LegalSlug = 'terms' | 'privacy' | 'rules';

export type LegalPage = {
  slug: LegalSlug;
  titleKey: string;
  descriptionKey: string;
  sections: Array<{
    headingKey: string;
    bodyKeys: string[];
  }>;
};

export const legalPages: LegalPage[] = [
  {
    slug: 'terms',
    titleKey: 'legalTermsTitle',
    descriptionKey: 'legalTermsDescription',
    sections: [
      {
        headingKey: 'legalTermsAboutHeading',
        bodyKeys: ['legalTermsAbout1', 'legalTermsAbout2'],
      },
      {
        headingKey: 'legalTermsAccountHeading',
        bodyKeys: ['legalTermsAccount1', 'legalTermsAccount2'],
      },
      {
        headingKey: 'legalTermsListingsHeading',
        bodyKeys: ['legalTermsListings1', 'legalTermsListings2'],
      },
      {
        headingKey: 'legalTermsChangesHeading',
        bodyKeys: ['legalTermsChanges1', 'legalTermsChanges2'],
      },
    ],
  },
  {
    slug: 'privacy',
    titleKey: 'legalPrivacyTitle',
    descriptionKey: 'legalPrivacyDescription',
    sections: [
      {
        headingKey: 'legalPrivacyCollectHeading',
        bodyKeys: ['legalPrivacyCollect1', 'legalPrivacyCollect2'],
      },
      {
        headingKey: 'legalPrivacyUseHeading',
        bodyKeys: ['legalPrivacyUse1', 'legalPrivacyUse2'],
      },
      {
        headingKey: 'legalPrivacyRightsHeading',
        bodyKeys: ['legalPrivacyRights1', 'legalPrivacyRights2'],
      },
    ],
  },
  {
    slug: 'rules',
    titleKey: 'legalRulesTitle',
    descriptionKey: 'legalRulesDescription',
    sections: [
      {
        headingKey: 'legalRulesAllowedHeading',
        bodyKeys: ['legalRulesAllowed1', 'legalRulesAllowed2'],
      },
      {
        headingKey: 'legalRulesHonestyHeading',
        bodyKeys: ['legalRulesHonesty1', 'legalRulesHonesty2'],
      },
      {
        headingKey: 'legalRulesModerationHeading',
        bodyKeys: ['legalRulesModeration1', 'legalRulesModeration2'],
      },
    ],
  },
];

export function getLegalPage(slug: string) {
  return legalPages.find((page) => page.slug === slug);
}
