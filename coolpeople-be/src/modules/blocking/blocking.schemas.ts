/**
 * Blocking Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Block / Unblock User Params
// -----------------------------------------------------------------------------

export const blockUserParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Get Blocked List Query (cursor-based pagination)
// -----------------------------------------------------------------------------

export const getBlockedListSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
