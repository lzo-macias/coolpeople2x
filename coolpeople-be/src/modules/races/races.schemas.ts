/**
 * Races Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Race ID Param
// -----------------------------------------------------------------------------

export const raceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
});

// -----------------------------------------------------------------------------
// Create Race
// -----------------------------------------------------------------------------

export const createRaceSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100, 'Title must be at most 100 characters'),
    description: z.string().max(1000).optional(),
    bannerUrl: z.string().url('Invalid banner URL').optional(),
    raceType: z.enum(['CANDIDATE_VS_CANDIDATE', 'PARTY_VS_PARTY']),
    winCondition: z.enum(['POINTS', 'BALLOT']),
    endDate: z.string().datetime().optional(),
    ballotOpenDate: z.string().datetime().optional(),
  }),
});

// -----------------------------------------------------------------------------
// Update Race
// -----------------------------------------------------------------------------

export const updateRaceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    bannerUrl: z.string().url('Invalid banner URL').optional(),
    endDate: z.string().datetime().optional(),
    ballotOpenDate: z.string().datetime().optional(),
  }),
});

// -----------------------------------------------------------------------------
// List Races Query
// -----------------------------------------------------------------------------

export const listRacesQuerySchema = z.object({
  query: z.object({
    type: z.enum(['CANDIDATE_VS_CANDIDATE', 'PARTY_VS_PARTY']).optional(),
    search: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Scoreboard Query
// -----------------------------------------------------------------------------

export const scoreboardQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
  query: z.object({
    period: z.enum(['today', '7d', '30d', '90d', 'all']).default('all'),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Nominate
// -----------------------------------------------------------------------------

export const nominateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
  body: z.object({
    nomineeId: z.string().uuid('Invalid nominee ID'),
    reelId: z.string().uuid('Invalid reel ID'),
  }),
});

// -----------------------------------------------------------------------------
// User Nominations Param
// -----------------------------------------------------------------------------

export const userNominationsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});
