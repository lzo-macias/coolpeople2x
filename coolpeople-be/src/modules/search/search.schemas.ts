/**
 * Search Module Validation Schemas
 */

import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.object({
    q: z.string().max(200).default(''),
    type: z.enum(['users', 'parties', 'races', 'reels', 'hashtags']).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});
