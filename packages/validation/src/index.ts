import { z } from 'zod';

export const listingStatusSchema = z.enum([
  'draft',
  'pending_review',
  'active',
  'rejected',
  'paused',
  'sold',
  'expired',
]);

export const localeSchema = z.enum(['en', 'si']);
