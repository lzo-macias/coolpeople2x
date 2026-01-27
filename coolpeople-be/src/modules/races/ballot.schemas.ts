/**
 * Ballot Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Get Ballot Status / Results
// -----------------------------------------------------------------------------

export const ballotParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
});

// -----------------------------------------------------------------------------
// Submit / Update Ballot
// -----------------------------------------------------------------------------

export const submitBallotSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid race ID'),
  }),
  body: z.object({
    rankings: z
      .array(
        z.object({
          competitorId: z.string().uuid('Invalid competitor ID'),
          rank: z.number().int().positive(),
        })
      )
      .min(1, 'At least one ranking is required'),
  }),
});
