export const ACCOUNT_NAV_SECTIONS = [
  'shop',
  'partsShop',
  'inbox',
  'saved',
  'account',
] as const;

export type AccountNavSectionId = (typeof ACCOUNT_NAV_SECTIONS)[number];

export type AccountNavItemId =
  | 'inventory'
  | 'listings'
  | 'showroom'
  | 'performance'
  | 'partsListings'
  | 'partsShowroom'
  | 'messages'
  | 'notifications'
  | 'favourites'
  | 'savedSearches'
  | 'profile';

export type AccountNavLabelKey =
  | 'inventory'
  | 'myListings'
  | 'dealerShowroom'
  | 'performance'
  | 'partsListings'
  | 'partsShowroom'
  | 'messages'
  | 'notifications'
  | 'savedListings'
  | 'savedSearches'
  | 'accountDetails';

export type AccountNavSectionLabelKey =
  | 'navSectionShop'
  | 'navSectionPartsShop'
  | 'navSectionInbox'
  | 'navSectionSaved'
  | 'navSectionAccount';

export type AccountNavItemDef = {
  id: AccountNavItemId;
  section: AccountNavSectionId;
  labelKey: AccountNavLabelKey;
  hrefSuffix: string;
  dealerOnly?: boolean;
  partsDealerOnly?: boolean;
  eitherShop?: boolean;
  badgeKey?: 'messages' | 'notifications';
  match: (path: string) => boolean;
};

export type AccountNavSection = {
  id: AccountNavSectionId;
  labelKey: AccountNavSectionLabelKey;
  items: AccountNavItemDef[];
};

export const ACCOUNT_NAV_SECTION_LABEL: Record<
  AccountNavSectionId,
  AccountNavSectionLabelKey
> = {
  shop: 'navSectionShop',
  partsShop: 'navSectionPartsShop',
  inbox: 'navSectionInbox',
  saved: 'navSectionSaved',
  account: 'navSectionAccount',
};

export const ACCOUNT_NAV_ITEMS: AccountNavItemDef[] = [
  {
    id: 'inventory',
    section: 'shop',
    labelKey: 'inventory',
    hrefSuffix: '/inventory',
    dealerOnly: true,
    match: (path) => path.includes('/account/inventory'),
  },
  {
    id: 'listings',
    section: 'shop',
    labelKey: 'myListings',
    hrefSuffix: '/listings',
    match: (path) =>
      path.includes('/account/listings') && !path.includes('parts-listings'),
  },
  {
    id: 'showroom',
    section: 'shop',
    labelKey: 'dealerShowroom',
    hrefSuffix: '/showroom',
    dealerOnly: true,
    match: (path) =>
      path.includes('/account/showroom') && !path.includes('parts-showroom'),
  },
  {
    id: 'performance',
    section: 'shop',
    labelKey: 'performance',
    hrefSuffix: '/performance',
    eitherShop: true,
    match: (path) =>
      path.includes('/account/performance') ||
      path.includes('/account/parts-performance'),
  },
  {
    id: 'partsListings',
    section: 'partsShop',
    labelKey: 'partsListings',
    hrefSuffix: '/parts-listings',
    partsDealerOnly: true,
    match: (path) => path.includes('/account/parts-listings'),
  },
  {
    id: 'partsShowroom',
    section: 'partsShop',
    labelKey: 'partsShowroom',
    hrefSuffix: '/parts-showroom',
    partsDealerOnly: true,
    match: (path) => path.includes('/account/parts-showroom'),
  },
  {
    id: 'messages',
    section: 'inbox',
    labelKey: 'messages',
    hrefSuffix: '/messages',
    badgeKey: 'messages',
    match: (path) => path.includes('/account/messages'),
  },
  {
    id: 'notifications',
    section: 'inbox',
    labelKey: 'notifications',
    hrefSuffix: '/notifications',
    badgeKey: 'notifications',
    match: (path) => path.includes('/account/notifications'),
  },
  {
    id: 'favourites',
    section: 'saved',
    labelKey: 'savedListings',
    hrefSuffix: '/favourites',
    match: (path) => path.includes('/account/favourites'),
  },
  {
    id: 'savedSearches',
    section: 'saved',
    labelKey: 'savedSearches',
    hrefSuffix: '/saved-searches',
    match: (path) => path.includes('/account/saved-searches'),
  },
  {
    id: 'profile',
    section: 'account',
    labelKey: 'accountDetails',
    hrefSuffix: '/profile',
    match: (path) => path.includes('/account/profile'),
  },
];

function itemVisible(
  item: AccountNavItemDef,
  roles: { isDealer: boolean; isPartsDealer: boolean },
) {
  if (item.eitherShop && !roles.isDealer && !roles.isPartsDealer) return false;
  if (item.dealerOnly && !roles.isDealer) return false;
  if (item.partsDealerOnly && !roles.isPartsDealer) return false;
  return true;
}

export function visibleAccountNavSections(roles: {
  isDealer: boolean;
  isPartsDealer: boolean;
}): AccountNavSection[] {
  const items = ACCOUNT_NAV_ITEMS.filter((item) => itemVisible(item, roles));
  return ACCOUNT_NAV_SECTIONS.map((id) => ({
    id,
    labelKey: ACCOUNT_NAV_SECTION_LABEL[id],
    items: items.filter((item) => item.section === id),
  })).filter((section) => section.items.length > 0);
}

export function flattenAccountNav(roles: {
  isDealer: boolean;
  isPartsDealer: boolean;
}): AccountNavItemDef[] {
  return visibleAccountNavSections(roles).flatMap((section) => section.items);
}
