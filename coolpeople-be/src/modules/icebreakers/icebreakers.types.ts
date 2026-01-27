/**
 * Icebreakers Module Types
 */

import type { IcebreakerType } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Icebreaker Response
// -----------------------------------------------------------------------------

export interface IcebreakerResponse {
  id: string;
  type: IcebreakerType;
  prompt: string;
  sortOrder: number;
  createdAt: Date;

  // Type-specific responses
  textResponse?: string | null;
  tagsResponse?: string[];
  sliderResponse?: number | null;
  videoUrl?: string | null;
  gameOptions?: string[];
  gameAnswer?: number | null;
}

// -----------------------------------------------------------------------------
// Create/Update Requests
// -----------------------------------------------------------------------------

export interface CreateIcebreakerRequest {
  type: IcebreakerType;
  prompt: string;
  sortOrder?: number;

  // Type-specific fields
  textResponse?: string;
  tagsResponse?: string[];
  sliderResponse?: number;
  videoUrl?: string;
  gameOptions?: string[];
  gameAnswer?: number;
}

export interface UpdateIcebreakerRequest {
  prompt?: string;
  sortOrder?: number;

  // Type-specific fields
  textResponse?: string;
  tagsResponse?: string[];
  sliderResponse?: number;
  videoUrl?: string;
  gameOptions?: string[];
  gameAnswer?: number;
}

export interface ReorderIcebreakersRequest {
  icebreakers: { id: string; sortOrder: number }[];
}
