/**
 * Auth Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Registration Schema
// -----------------------------------------------------------------------------

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      )
      .toLowerCase()
      .trim(),
    displayName: z
      .string()
      .min(1, 'Display name is required')
      .max(50, 'Display name must be at most 50 characters')
      .trim(),
  }),
});

// -----------------------------------------------------------------------------
// Login Schema
// -----------------------------------------------------------------------------

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

// -----------------------------------------------------------------------------
// OAuth Schema
// -----------------------------------------------------------------------------

export const oauthSchema = z.object({
  body: z.object({
    provider: z.enum(['google', 'apple']),
    idToken: z.string().min(1, 'ID token is required'),
  }),
});

// -----------------------------------------------------------------------------
// Update Profile Schema
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
      .optional(),
    avatarUrl: z
      .string()
      .url('Invalid avatar URL')
      .optional(),
  }),
});
