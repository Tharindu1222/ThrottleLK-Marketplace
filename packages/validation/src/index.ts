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

export const registerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().min(9).max(20).optional(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(200),
});

const optionalPositiveInt = z.number().int().positive().optional().nullable();
const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable();

export const createListingSchema = z.object({
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  categoryId: z.string().uuid(),
  districtId: z.string().uuid(),
  cityId: z.string().uuid(),
  title: z.string().min(5).max(160),
  description: z.string().min(20).max(10000),
  priceLkr: z.number().int().positive(),
  negotiable: z.boolean().default(true),
  manufactureYear: z.number().int().min(1970).max(2100),
  registrationYear: z.number().int().min(1970).max(2100).optional(),
  engineCc: z.number().int().positive().optional(),
  mileage: z.number().int().nonnegative(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']),
  transmission: z.enum(['manual', 'automatic', 'semi_automatic', 'other']),
  condition: z.enum(['new', 'used', 'reconditioned']),
  colour: z.string().max(60).optional(),
  phone: z.string().min(9).max(20),
  whatsapp: z.string().min(9).max(20).optional(),
  dealerId: z.string().uuid().optional(),
  costPriceLkr: optionalPositiveInt,
  purchaseDate: optionalIsoDate,
});

export const updateListingSchema = createListingSchema.partial();

export const markSoldSchema = z.object({
  soldPriceLkr: z.number().int().positive(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const contactClickSchema = z.object({
  type: z.enum(['phone', 'whatsapp']),
});

export const performanceRangeSchema = z.enum(['all', '7d', '30d']).default('all');

export const inventoryDocumentTypeSchema = z.enum([
  'insurance',
  'revenue_license',
  'ownership_cr',
]);

export const createInventoryItemSchema = z.object({
  title: z.string().min(2).max(160),
  brandName: z.string().max(80).optional().nullable(),
  modelName: z.string().max(80).optional().nullable(),
  manufactureYear: z.number().int().min(1970).max(2100).optional().nullable(),
  purchaseDate: optionalIsoDate,
  costPriceLkr: optionalPositiveInt,
  askingPriceLkr: optionalPositiveInt,
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const rejectListingSchema = z.object({
  reason: z.string().min(5).max(1000),
});

export const createDealerSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(5000).optional(),
  phone: z.string().min(9).max(20),
  whatsapp: z.string().min(9).max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().max(300).optional(),
  districtId: z.string().uuid(),
  cityId: z.string().uuid(),
});

const emptyToNullUrl = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    const parsed = z.string().url().safeParse(v);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid url',
      });
      return z.NEVER;
    }
    return parsed.data;
  });

const emptyToNullEmail = z
  .string()
  .max(254)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === '') return null;
    const parsed = z.string().email().safeParse(v);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email',
      });
      return z.NEVER;
    }
    return parsed.data;
  });

export const updateDealerProfileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(5000).optional().nullable(),
    phone: z.string().min(9).max(20).optional(),
    whatsapp: z.string().min(9).max(20).optional().nullable(),
    email: emptyToNullEmail,
    website: emptyToNullUrl,
    address: z.string().max(300).optional().nullable(),
    districtId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    facebookUrl: emptyToNullUrl,
    tiktokUrl: emptyToNullUrl,
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude !== undefined && data.latitude !== null;
    const hasLng = data.longitude !== undefined && data.longitude !== null;
    const clearLat = data.latitude === null;
    const clearLng = data.longitude === null;
    if (clearLat && clearLng) return;
    if (clearLat !== clearLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'latitude and longitude must both be set or both cleared',
        path: clearLat ? ['longitude'] : ['latitude'],
      });
      return;
    }
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'latitude and longitude must both be provided',
        path: hasLat ? ['longitude'] : ['latitude'],
      });
    }
  });

export const contactListingSchema = z.object({
  buyerName: z.string().min(2).max(120),
  buyerPhone: z.string().min(9).max(20),
  buyerEmail: z.string().email().optional(),
  message: z.string().min(10).max(2000),
});

export const listingSortSchema = z.enum([
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'mileage_asc',
  'mileage_desc',
  'year_desc',
  'year_asc',
]);

export const startConversationSchema = z
  .object({
    listingId: z.string().uuid().optional(),
    partListingId: z.string().uuid().optional(),
    message: z.string().min(1).max(2000),
  })
  .superRefine((data, ctx) => {
    const hasListing = Boolean(data.listingId);
    const hasPart = Boolean(data.partListingId);
    if (hasListing === hasPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of listingId or partListingId',
        path: ['listingId'],
      });
    }
  });

export const partListingKindSchema = z.enum(['spare', 'modified']);

export const partListingFitmentSchema = z.object({
  brandId: z.string().uuid(),
  modelId: z.string().uuid().optional().nullable(),
});

export const createPartListingSchema = z.object({
  kind: partListingKindSchema,
  categoryId: z.string().uuid(),
  districtId: z.string().uuid(),
  cityId: z.string().uuid(),
  title: z.string().min(5).max(160),
  description: z.string().min(20).max(10000),
  priceLkr: z.number().int().positive(),
  negotiable: z.boolean().default(true),
  condition: z.enum(['new', 'used', 'reconditioned']),
  phone: z.string().min(9).max(20),
  whatsapp: z.string().min(9).max(20).optional(),
  fitments: z.array(partListingFitmentSchema).min(0).max(50),
});

export const updatePartListingSchema = createPartListingSchema.partial();

export const adminCreatePartListingSchema = createPartListingSchema.extend({
  partsDealerId: z.string().uuid(),
  status: listingStatusSchema.optional().default('draft'),
});

export const adminUpdatePartListingSchema = createPartListingSchema
  .partial()
  .extend({
    partsDealerId: z.string().uuid().optional(),
    status: listingStatusSchema.optional(),
  });

export const partListingSortSchema = z.enum([
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
]);

export const createPartsDealerSchema = createDealerSchema;
export const updatePartsDealerProfileSchema = updateDealerProfileSchema;

export const createPartCategorySchema = z.object({
  name: z.string().min(1).max(80),
  parentId: z.string().uuid().nullable().optional(),
});

export const updatePartCategorySchema = createPartCategorySchema.partial();

export const sendConversationMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const adminResolveReportSchema = z.object({
  action: z.enum(['remove_listing', 'dismiss', 'warn_seller']),
  note: z.string().trim().min(5).max(1000).optional(),
});

export const rejectDealerSchema = z.object({
  reason: z.string().min(5).max(1000),
});

export const rejectPartsDealerSchema = rejectDealerSchema;

export const dealerStatusSchema = z.enum([
  'pending',
  'active',
  'rejected',
  'suspended',
]);

export const adminCreateDealerSchema = createDealerSchema.extend({
  ownerUserId: z.string().uuid(),
  status: dealerStatusSchema.optional().default('pending'),
  /** Admin-only verified badge; only applies when status is active. */
  verified: z.boolean().optional(),
});

export const adminUpdateDealerSchema = createDealerSchema.partial().extend({
  ownerUserId: z.string().uuid().optional(),
  status: dealerStatusSchema.optional(),
  /** Admin-only verified badge; only applies when status is active. */
  verified: z.boolean().optional(),
});

export const adminCreatePartsDealerSchema = adminCreateDealerSchema;
export const adminUpdatePartsDealerSchema = adminUpdateDealerSchema;

export const savedSearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().positive().optional(),
  minYear: z.number().int().min(1970).max(2100).optional(),
  maxYear: z.number().int().min(1970).max(2100).optional(),
  condition: z.enum(['new', 'used', 'reconditioned']).optional(),
  sort: listingSortSchema.optional(),
});

export const createSavedSearchSchema = z.object({
  name: z.string().min(2).max(120),
  query: savedSearchQuerySchema,
  notificationsEnabled: z.boolean().optional().default(false),
});

export const updateSavedSearchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  query: savedSearchQuerySchema.optional(),
  notificationsEnabled: z.boolean().optional(),
});

export const createReportSchema = z.object({
  listingId: z.string().uuid(),
  reason: z.enum([
    'spam',
    'fraud',
    'wrong_info',
    'inappropriate',
    'duplicate',
    'other',
  ]),
  description: z.string().min(10).max(2000),
});

export const adminCreateBrandSchema = z.object({
  name: z.string().min(1).max(80),
});

export const adminCreateModelSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(120),
  categoryId: z.string().uuid().optional(),
});

export const adminCreateDistrictSchema = z.object({
  name: z.string().min(1).max(80),
});

export const adminCreateCitySchema = z.object({
  districtId: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export const promoSubjectTypeSchema = z.enum(['bike', 'part']);

export const createPromoPackageSchema = z.object({
  kind: promoSubjectTypeSchema,
  name: z.string().trim().min(1).max(80),
  durationDays: z.number().int().min(1).max(365),
  priceLkr: z.number().int().min(0),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updatePromoPackageSchema = createPromoPackageSchema.partial();

export const createPromoBankAccountSchema = z.object({
  bankName: z.string().trim().min(1).max(80),
  accountName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(1).max(40),
  branch: z.string().trim().max(80).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updatePromoBankAccountSchema = createPromoBankAccountSchema.partial();

export const updatePromoSettingsSchema = z.object({
  whatsapp: z.string().trim().max(20).optional().nullable(),
});

export const createPromoRequestMetaSchema = z
  .object({
    packageId: z.string().uuid(),
    listingId: z.string().uuid().optional(),
    partListingId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasListing = Boolean(data.listingId);
    const hasPart = Boolean(data.partListingId);
    if (hasListing === hasPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of listingId or partListingId',
        path: ['listingId'],
      });
    }
  });

export const rejectPromoRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const adminPlaceHomepageSchema = z
  .object({
    subjectType: promoSubjectTypeSchema,
    listingId: z.string().uuid().optional(),
    partListingId: z.string().uuid().optional(),
    durationDays: z.number().int().min(1).max(365).optional(),
    endsAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.subjectType === 'bike' && !data.listingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'listingId is required',
        path: ['listingId'],
      });
    }
    if (data.subjectType === 'part' && !data.partListingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'partListingId is required',
        path: ['partListingId'],
      });
    }
    if (data.durationDays == null && !data.endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'durationDays or endsAt is required',
        path: ['durationDays'],
      });
    }
  });

export const adminUpdatePlacementSchema = z.object({
  endsAt: z.string().datetime(),
});

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const userRoleNameSchema = z.enum([
  'buyer',
  'seller',
  'dealer',
  'parts_dealer',
  'admin',
]);

export const adminCreateUserSchema = registerSchema.extend({
  roles: z.array(userRoleNameSchema).min(1),
  status: z.enum(['active', 'suspended']).optional().default('active'),
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(9).max(20).optional().nullable(),
  password: z.string().min(8).max(128).optional(),
  roles: z.array(userRoleNameSchema).min(1).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export const adminCreateListingSchema = createListingSchema.extend({
  sellerId: z.string().uuid(),
  status: listingStatusSchema.optional().default('draft'),
});

export const adminUpdateListingSchema = createListingSchema
  .partial()
  .extend({
    sellerId: z.string().uuid().optional(),
    status: listingStatusSchema.optional(),
  });

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    phone: z.string().min(9).max(20).optional().nullable(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentPassword is required to set a new password',
        path: ['currentPassword'],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type MarkSoldInput = z.infer<typeof markSoldSchema>;
export type ContactClickInput = z.infer<typeof contactClickSchema>;
export type PerformanceRange = z.infer<typeof performanceRangeSchema>;
export type InventoryDocumentType = z.infer<typeof inventoryDocumentTypeSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type UpdateDealerProfileInput = z.infer<typeof updateDealerProfileSchema>;
export type ContactListingInput = z.infer<typeof contactListingSchema>;
export type ListingSort = z.infer<typeof listingSortSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendConversationMessageInput = z.infer<
  typeof sendConversationMessageSchema
>;
export type AdminResolveReportInput = z.infer<typeof adminResolveReportSchema>;
export type RejectDealerInput = z.infer<typeof rejectDealerSchema>;
export type AdminCreateDealerInput = z.infer<typeof adminCreateDealerSchema>;
export type AdminUpdateDealerInput = z.infer<typeof adminUpdateDealerSchema>;
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;
export type UpdateSavedSearchInput = z.infer<typeof updateSavedSearchSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AdminCreateBrandInput = z.infer<typeof adminCreateBrandSchema>;
export type AdminCreateModelInput = z.infer<typeof adminCreateModelSchema>;
export type AdminCreateDistrictInput = z.infer<typeof adminCreateDistrictSchema>;
export type AdminCreateCityInput = z.infer<typeof adminCreateCitySchema>;
export type AdminUpdateUserStatusInput = z.infer<
  typeof adminUpdateUserStatusSchema
>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminCreateListingInput = z.infer<typeof adminCreateListingSchema>;
export type AdminUpdateListingInput = z.infer<typeof adminUpdateListingSchema>;
export type AdminCreatePartListingInput = z.infer<
  typeof adminCreatePartListingSchema
>;
export type AdminUpdatePartListingInput = z.infer<
  typeof adminUpdatePartListingSchema
>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PartListingKind = z.infer<typeof partListingKindSchema>;
export type CreatePartListingInput = z.infer<typeof createPartListingSchema>;
export type UpdatePartListingInput = z.infer<typeof updatePartListingSchema>;
export type PartListingSort = z.infer<typeof partListingSortSchema>;
export type CreatePartsDealerInput = z.infer<typeof createPartsDealerSchema>;
export type UpdatePartsDealerProfileInput = z.infer<
  typeof updatePartsDealerProfileSchema
>;
export type AdminCreatePartsDealerInput = z.infer<
  typeof adminCreatePartsDealerSchema
>;
export type AdminUpdatePartsDealerInput = z.infer<
  typeof adminUpdatePartsDealerSchema
>;
export type RejectPartsDealerInput = z.infer<typeof rejectPartsDealerSchema>;
export type CreatePartCategoryInput = z.infer<typeof createPartCategorySchema>;
export type UpdatePartCategoryInput = z.infer<typeof updatePartCategorySchema>;
export type PromoSubjectType = z.infer<typeof promoSubjectTypeSchema>;
export type CreatePromoPackageInput = z.infer<typeof createPromoPackageSchema>;
export type UpdatePromoPackageInput = z.infer<typeof updatePromoPackageSchema>;
export type CreatePromoBankAccountInput = z.infer<
  typeof createPromoBankAccountSchema
>;
export type UpdatePromoBankAccountInput = z.infer<
  typeof updatePromoBankAccountSchema
>;
export type UpdatePromoSettingsInput = z.infer<typeof updatePromoSettingsSchema>;
export type CreatePromoRequestMetaInput = z.infer<
  typeof createPromoRequestMetaSchema
>;
export type RejectPromoRequestInput = z.infer<typeof rejectPromoRequestSchema>;
export type AdminPlaceHomepageInput = z.infer<typeof adminPlaceHomepageSchema>;
export type AdminUpdatePlacementInput = z.infer<
  typeof adminUpdatePlacementSchema
>;
