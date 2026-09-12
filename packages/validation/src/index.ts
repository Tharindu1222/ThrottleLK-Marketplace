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
  engineCc: z.number().int().positive(),
  mileage: z.number().int().nonnegative(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']),
  transmission: z.enum(['manual', 'automatic', 'semi_automatic', 'other']),
  condition: z.enum(['new', 'used', 'reconditioned']),
  colour: z.string().max(60).optional(),
  phone: z.string().min(9).max(20),
  whatsapp: z.string().min(9).max(20).optional(),
  dealerId: z.string().uuid().optional(),
});

export const updateListingSchema = createListingSchema.partial();

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

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export const sendConversationMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const adminResolveReportSchema = z.object({
  status: z.enum(['actioned', 'dismissed']),
});

export const rejectDealerSchema = z.object({
  reason: z.string().min(5).max(1000),
});

export const dealerStatusSchema = z.enum([
  'pending',
  'active',
  'rejected',
  'suspended',
]);

export const adminCreateDealerSchema = createDealerSchema.extend({
  ownerUserId: z.string().uuid(),
  status: dealerStatusSchema.optional().default('pending'),
});

export const adminUpdateDealerSchema = createDealerSchema.partial().extend({
  ownerUserId: z.string().uuid().optional(),
  status: dealerStatusSchema.optional(),
});

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

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const userRoleNameSchema = z.enum(['buyer', 'seller', 'dealer', 'admin']);

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
export type CreateDealerInput = z.infer<typeof createDealerSchema>;
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
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
