/**
 * Users Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Get User Params
// -----------------------------------------------------------------------------

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

export const usernameParamSchema = z.object({
  params: z.object({
    username: z.string().min(1, 'Username is required'),
  }),
});

// -----------------------------------------------------------------------------
// Update Profile
// -----------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z
      .string()
      .min(1, 'Display name cannot be empty')
      .max(50, 'Display name must be at most 50 characters')
      .trim()
      .optional(),
    bio: z
      .string()
      .max(500, 'Bio must be at most 500 characters')
      .trim()
      .nullable()
      .optional(),
    avatarUrl: z
      .string()
      .refine(
        (val) => {
          // Allow null/empty
          if (!val) return true;
          // Allow data URLs (base64 images)
          if (val.startsWith('data:image/')) return true;
          // Allow regular URLs
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid avatar URL or image data' }
      )
      .nullable()
      .optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .nullable()
      .optional(),
  }),
});

// -----------------------------------------------------------------------------
// Become Candidate
// -----------------------------------------------------------------------------

export const becomeCandidateSchema = z.object({
  body: z.object({
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms to become a candidate' }),
    }),
  }),
});

// -----------------------------------------------------------------------------
// Search Users
// -----------------------------------------------------------------------------

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    limit: z.coerce.number().int().positive().max(50).default(20),
    cursor: z.string().optional(),
  }),
});

// -----------------------------------------------------------------------------
// Privacy Toggle
// -----------------------------------------------------------------------------

export const togglePrivacySchema = z.object({
  body: z.object({
    isPrivate: z.boolean(),
  }),
});

// -----------------------------------------------------------------------------
// Follow Request Params
// -----------------------------------------------------------------------------

export const followRequestParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
    requestId: z.string().min(1, 'Request ID is required'),
  }),
});
