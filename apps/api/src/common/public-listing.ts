import { isPubliclyListed } from '../listings/listing-expiry';
import type { Listing } from '../listings/listing.entity';
import type { PartListing } from '../part-listings/part-listing.entity';

export function isPublicBike(listing: Listing): boolean {
  return (
    isPubliclyListed(listing.status, listing.expiresAt) &&
    listing.seller?.status === 'active' &&
    (!listing.dealerId ||
      (listing.dealer?.status === 'active' &&
        listing.dealer.owner?.status === 'active'))
  );
}

export function isPublicPart(listing: PartListing): boolean {
  return (
    listing.status === 'active' &&
    isPubliclyListed(listing.status, listing.expiresAt) &&
    listing.partsDealer?.status === 'active' &&
    listing.partsDealer.owner?.status === 'active'
  );
}

/** Aliases are constants supplied by application code, never request input. */
export function publicBikeSql(alias: string): string {
  return `${alias}.status = 'active' AND (${alias}.expires_at IS NULL OR ${alias}.expires_at > NOW())
    AND EXISTS (SELECT 1 FROM users visibility_user WHERE visibility_user.id = ${alias}.seller_id AND visibility_user.status = 'active')
    AND (${alias}.dealer_id IS NULL OR EXISTS (SELECT 1 FROM dealers visibility_shop JOIN users visibility_owner ON visibility_owner.id = visibility_shop.owner_user_id WHERE visibility_shop.id = ${alias}.dealer_id AND visibility_shop.status = 'active' AND visibility_owner.status = 'active'))`;
}

export function publicPartSql(alias: string): string {
  return `${alias}.status = 'active' AND (${alias}.expires_at IS NULL OR ${alias}.expires_at > NOW())
    AND EXISTS (SELECT 1 FROM parts_dealers visibility_shop JOIN users visibility_owner ON visibility_owner.id = visibility_shop.owner_user_id WHERE visibility_shop.id = ${alias}.parts_dealer_id AND visibility_shop.status = 'active' AND visibility_owner.status = 'active')`;
}
