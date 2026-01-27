/**
 * Reviews Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// User Reviews Params
// -----------------------------------------------------------------------------

export const userReviewsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Party Reviews Params
// -----------------------------------------------------------------------------

export const partyReviewsParamSchema = z.object({
  params: z.object({
    partyId: z.string().uuid('Invalid party ID'),
  }),
});

// -----------------------------------------------------------------------------
// Review ID Param
// -----------------------------------------------------------------------------

export const reviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid review ID'),
  }),
});

// -----------------------------------------------------------------------------
// Review + Reply ID Params
// -----------------------------------------------------------------------------

export const reviewReplyParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid review ID'),
    replyId: z.string().uuid('Invalid reply ID'),
  }),
});

// -----------------------------------------------------------------------------
// Create Review
// -----------------------------------------------------------------------------

export const createReviewSchema = z.object({
  body: z.object({
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    content: z
      .string()
      .max(2000, 'Content must be at most 2000 characters')
      .trim()
      .optional(),
  }),
});

// -----------------------------------------------------------------------------
// Create Reply
// -----------------------------------------------------------------------------

export const createReplySchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Reply cannot be empty')
      .max(1000, 'Reply must be at most 1000 characters')
      .trim(),
  }),
});

// -----------------------------------------------------------------------------
// Review Cursor Query
// -----------------------------------------------------------------------------

export const reviewCursorSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
