/** Approximate district centers for shops that have not dropped a map pin. */
const DISTRICT_CENTERS: Record<string, { latitude: number; longitude: number }> =
  {
    Ampara: { latitude: 7.297, longitude: 81.682 },
    Anuradhapura: { latitude: 8.312, longitude: 80.413 },
    Badulla: { latitude: 6.993, longitude: 81.055 },
    Batticaloa: { latitude: 7.731, longitude: 81.674 },
    Colombo: { latitude: 6.9271, longitude: 79.8612 },
    Galle: { latitude: 6.0535, longitude: 80.221 },
    Gampaha: { latitude: 7.091, longitude: 79.999 },
    Hambantota: { latitude: 6.124, longitude: 81.119 },
    Jaffna: { latitude: 9.661, longitude: 80.025 },
    Kalutara: { latitude: 6.585, longitude: 79.961 },
    Kandy: { latitude: 7.291, longitude: 80.634 },
    Kegalle: { latitude: 7.251, longitude: 80.347 },
    Kilinochchi: { latitude: 9.38, longitude: 80.377 },
    Kurunegala: { latitude: 7.487, longitude: 80.365 },
    Mannar: { latitude: 8.981, longitude: 79.904 },
    Matale: { latitude: 7.467, longitude: 80.623 },
    Matara: { latitude: 5.948, longitude: 80.535 },
    Monaragala: { latitude: 6.873, longitude: 81.351 },
    Mullaitivu: { latitude: 9.267, longitude: 80.814 },
    'Nuwara Eliya': { latitude: 6.97, longitude: 80.783 },
    Polonnaruwa: { latitude: 7.94, longitude: 81.003 },
    Puttalam: { latitude: 8.036, longitude: 79.828 },
    Ratnapura: { latitude: 6.706, longitude: 80.385 },
    Trincomalee: { latitude: 8.588, longitude: 81.215 },
    Vavuniya: { latitude: 8.751, longitude: 80.497 },
  };

export type MapLocation = {
  latitude: number;
  longitude: number;
  approximate: boolean;
};

export function resolveMapLocation(dealer: {
  latitude?: number | null;
  longitude?: number | null;
  district?: { name: string } | null;
}): MapLocation | null {
  if (
    dealer.latitude != null &&
    dealer.longitude != null &&
    (dealer.latitude !== 0 || dealer.longitude !== 0)
  ) {
    return {
      latitude: dealer.latitude,
      longitude: dealer.longitude,
      approximate: false,
    };
  }
  const center = dealer.district?.name
    ? DISTRICT_CENTERS[dealer.district.name]
    : undefined;
  if (!center) return null;
  return { ...center, approximate: true };
}
