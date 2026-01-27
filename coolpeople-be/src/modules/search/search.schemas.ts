/**
 * Search Module Validation Schemas
 */

import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    type: z.enum(['users', 'parties', 'races', 'reels', 'hashtags']).optional(),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});
