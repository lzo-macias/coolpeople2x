/**
 * Points Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Get User Point Summary
// -----------------------------------------------------------------------------

export const userPointsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Get Point History
// -----------------------------------------------------------------------------

export const pointHistoryParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

export const pointHistoryQuerySchema = z.object({
  query: z.object({
    raceId: z.string().uuid('Invalid race ID').optional(),
    period: z.enum(['today', '7d', '30d', '90d', 'all']).default('30d'),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Get Sparkline Data
// -----------------------------------------------------------------------------

export const sparklineParamSchema = z.object({
  params: z.object({
    ledgerId: z.string().uuid('Invalid ledger ID'),
  }),
});

export const sparklineQuerySchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  }),
});
