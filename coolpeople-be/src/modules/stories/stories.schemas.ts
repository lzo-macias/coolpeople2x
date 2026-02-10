/**
 * Stories Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Story ID Param
// -----------------------------------------------------------------------------

export const storyIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid story ID'),
  }),
});

// -----------------------------------------------------------------------------
// Create Story
// -----------------------------------------------------------------------------

export const createStorySchema = z.object({
  body: z.object({
    videoUrl: z.string(),
    thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
    duration: z
      .number()
      .int()
      .min(1, 'Story must be at least 1 second')
      .max(60, 'Story must be at most 60 seconds'),
    metadata: z.record(z.any()).optional(),
  }),
});

// -----------------------------------------------------------------------------
// User Stories Param
// -----------------------------------------------------------------------------

export const userStoriesParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});
