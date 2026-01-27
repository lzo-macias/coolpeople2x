/**
 * Comments Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Reel Comments Params
// -----------------------------------------------------------------------------

export const reelCommentsParamSchema = z.object({
  params: z.object({
    reelId: z.string().uuid('Invalid reel ID'),
  }),
});

// -----------------------------------------------------------------------------
// Comment ID Param
// -----------------------------------------------------------------------------

export const commentIdParamSchema = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment ID'),
  }),
});

// -----------------------------------------------------------------------------
// Create Comment
// -----------------------------------------------------------------------------

export const createCommentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Comment cannot be empty')
      .max(1000, 'Comment must be at most 1000 characters')
      .trim(),
    parentId: z.string().uuid('Invalid parent comment ID').optional(),
  }),
});

// -----------------------------------------------------------------------------
// Comment Cursor Query
// -----------------------------------------------------------------------------

export const commentCursorSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
