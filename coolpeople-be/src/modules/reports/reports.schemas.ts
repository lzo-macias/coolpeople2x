/**
 * Reports Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Create Report
// -----------------------------------------------------------------------------

export const createReportSchema = z.object({
  body: z.object({
    targetType: z.enum(['USER', 'REEL', 'COMMENT', 'REVIEW', 'PARTY']),
    targetId: z.string().uuid('Invalid target ID'),
    reason: z
      .string()
      .min(1, 'Reason is required')
      .max(500, 'Reason must be at most 500 characters')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must be at most 2000 characters')
      .trim()
      .optional(),
  }),
});

// -----------------------------------------------------------------------------
// Report ID Param
// -----------------------------------------------------------------------------

export const reportIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid report ID'),
  }),
});

// -----------------------------------------------------------------------------
// List Reports Query
// -----------------------------------------------------------------------------

export const listReportsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Resolve Report
// -----------------------------------------------------------------------------

export const resolveReportSchema = z.object({
  body: z.object({
    status: z.enum(['CONFIRMED', 'REJECTED']),
    moderatorNotes: z
      .string()
      .max(2000, 'Moderator notes must be at most 2000 characters')
      .trim()
      .optional(),
  }),
});
