/**
 * Reels Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Reel ID Param
// -----------------------------------------------------------------------------

export const reelIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid reel ID'),
  }),
});

// -----------------------------------------------------------------------------
// Create Reel
// -----------------------------------------------------------------------------

export const createReelSchema = z.object({
  body: z.object({
    videoUrl: z
      .string()
      .refine(
        (val) => {
          if (!val) return false;
          // Allow data URLs (base64 videos)
          if (val.startsWith('data:')) return true;
          // Allow blob URLs (for local preview)
          if (val.startsWith('blob:')) return true;
          // Allow regular URLs
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid video URL or data' }
      ),
    thumbnailUrl: z
      .string()
      .refine(
        (val) => {
          if (!val) return true;
          if (val.startsWith('data:')) return true;
          if (val.startsWith('blob:')) return true;
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid thumbnail URL or data' }
      )
      .optional(),
    selfieOverlayUrl: z.string().url('Invalid overlay URL').optional(),
    duration: z
      .number()
      .int()
      .min(1, 'Reel must be at least 1 second')
      .max(600, 'Reel must be at most 10 minutes')
      .optional()
      .default(30),
    isMirrored: z.boolean().optional().default(false),
    title: z.string().max(100, 'Title must be at most 100 characters').optional(),
    description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
    partyId: z.string().uuid('Invalid party ID').optional().nullable(),
    quoteParentId: z.string().uuid('Invalid quote parent ID').optional(),
    soundId: z.string().uuid('Invalid sound ID').optional(),
    locationId: z.string().uuid('Invalid location ID').optional(),
    raceIds: z.array(z.string().uuid('Invalid race ID')).max(5).optional(),
  }),
});

// -----------------------------------------------------------------------------
// Get User Reels
// -----------------------------------------------------------------------------

export const userReelsParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Get Party Reels
// -----------------------------------------------------------------------------

export const partyReelsParamSchema = z.object({
  params: z.object({
    partyId: z.string().uuid('Invalid party ID'),
  }),
});

// -----------------------------------------------------------------------------
// Feed Query
// -----------------------------------------------------------------------------

export const feedQuerySchema = z.object({
  query: z.object({
    type: z.enum(['following', 'discover']).default('following'),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Engagement Schemas
// -----------------------------------------------------------------------------

export const reelEngagementParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid reel ID'),
  }),
});

export const watchEventSchema = z.object({
  body: z.object({
    watchPercent: z
      .number()
      .min(0, 'Watch percent must be at least 0')
      .max(1, 'Watch percent must be at most 1'),
  }),
});

// -----------------------------------------------------------------------------
// Hide Schemas
// -----------------------------------------------------------------------------

export const hideReelSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid reel ID'),
  }),
});

export const hideUserSchema = z.object({
  body: z.object({
    hiddenUserId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Cursor pagination for general lists
// -----------------------------------------------------------------------------

export const cursorQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
