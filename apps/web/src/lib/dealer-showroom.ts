export type DealerShowroomImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isCover?: boolean;
};

export type DealerShowroom = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  coverImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  ownerAvatarUrl: string | null;
  ownerDisplayName: string | null;
  createdAt?: string;
  verifiedAt?: string | null;
  images: DealerShowroomImage[];
  district?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

export function formatDealerLocation(dealer: {
  city?: { name: string } | null;
  district?: { name: string } | null;
}): string {
  const city = dealer.city?.name?.trim() ?? '';
  const district = dealer.district?.name?.trim() ?? '';
  if (city && district && city.toLowerCase() === district.toLowerCase()) {
    return city;
  }
  return [city, district].filter(Boolean).join(', ');
}

export function formatStreetAddress(address: string): string {
  return address
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

export function dealerCoverUrl(dealer: {
  coverImageUrl: string | null;
  images?: { imageUrl: string; sortOrder: number }[];
}): string | null {
  return (
    dealer.coverImageUrl ??
    [...(dealer.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]
      ?.imageUrl ??
    null
  );
}

export function dealerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function dealerWhatsappHref(
  whatsapp: string | null | undefined,
): string | null {
  const digits = whatsapp?.replace(/\D/g, '') ?? '';
  return digits ? `https://wa.me/${digits}` : null;
}

export function dealerDirectionsHref(
  dealer: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  },
  location: string,
): string | null {
  if (dealer.latitude != null && dealer.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${dealer.latitude},${dealer.longitude}`;
  }
  const query = [dealer.address, location].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function dealerOsmHref(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

export function dealerMemberYear(createdAt?: string): number | null {
  if (!createdAt) return null;
  const year = new Date(createdAt).getFullYear();
  return Number.isFinite(year) ? year : null;
}
