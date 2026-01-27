/**
 * Favorites Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// User ID Param (for /api/users/:id/favorite)
// -----------------------------------------------------------------------------

export const favoriteUserParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Favorites List Query (cursor-based pagination)
// -----------------------------------------------------------------------------

export const favoritesListQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
