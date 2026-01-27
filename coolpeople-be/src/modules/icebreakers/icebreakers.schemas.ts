/**
 * Icebreakers Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Icebreaker Type Enum
// -----------------------------------------------------------------------------

const icebreakerTypeEnum = z.enum(['WRITTEN', 'TAGS', 'GAMES', 'SLIDERS', 'VIDEOS']);

// -----------------------------------------------------------------------------
// Create Icebreaker
// -----------------------------------------------------------------------------

export const createIcebreakerSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
  body: z
    .object({
      type: icebreakerTypeEnum,
      prompt: z.string().min(1, 'Prompt is required').max(500, 'Prompt too long'),
      sortOrder: z.number().int().min(0).optional(),

      // Type-specific fields
      textResponse: z.string().max(1000).optional(),
      tagsResponse: z.array(z.string().max(50)).max(10).optional(),
      sliderResponse: z.number().int().min(1).max(10).optional(),
      videoUrl: z.string().url().optional(),
      gameOptions: z.array(z.string().max(200)).length(3).optional(),
      gameAnswer: z.number().int().min(0).max(2).optional(),
    })
    .refine(
      (data) => {
        // Validate type-specific fields
        switch (data.type) {
          case 'WRITTEN':
            return true; // textResponse optional on create
          case 'TAGS':
            return true; // tagsResponse optional on create
          case 'SLIDERS':
            return true; // sliderResponse optional on create
          case 'VIDEOS':
            return true; // videoUrl optional on create
          case 'GAMES':
            // If gameOptions provided, must have exactly 3
            if (data.gameOptions && data.gameOptions.length !== 3) return false;
            // If gameAnswer provided, gameOptions must also be provided
            if (data.gameAnswer !== undefined && !data.gameOptions) return false;
            return true;
          default:
            return true;
        }
      },
      { message: 'Invalid fields for icebreaker type' }
    ),
});

// -----------------------------------------------------------------------------
// Update Icebreaker
// -----------------------------------------------------------------------------

export const updateIcebreakerSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
    icebreakerId: z.string().uuid('Invalid icebreaker ID'),
  }),
  body: z.object({
    prompt: z.string().min(1).max(500).optional(),
    sortOrder: z.number().int().min(0).optional(),

    textResponse: z.string().max(1000).nullable().optional(),
    tagsResponse: z.array(z.string().max(50)).max(10).optional(),
    sliderResponse: z.number().int().min(1).max(10).nullable().optional(),
    videoUrl: z.string().url().nullable().optional(),
    gameOptions: z.array(z.string().max(200)).length(3).optional(),
    gameAnswer: z.number().int().min(0).max(2).nullable().optional(),
  }),
});

// -----------------------------------------------------------------------------
// Delete Icebreaker
// -----------------------------------------------------------------------------

export const deleteIcebreakerSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
    icebreakerId: z.string().uuid('Invalid icebreaker ID'),
  }),
});

// -----------------------------------------------------------------------------
// Reorder Icebreakers
// -----------------------------------------------------------------------------

export const reorderIcebreakersSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    icebreakers: z
      .array(
        z.object({
          id: z.string().uuid('Invalid icebreaker ID'),
          sortOrder: z.number().int().min(0),
        })
      )
      .min(1, 'Must provide at least one icebreaker'),
  }),
});

// -----------------------------------------------------------------------------
// Get Icebreakers Params
// -----------------------------------------------------------------------------

export const getIcebreakersSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});
