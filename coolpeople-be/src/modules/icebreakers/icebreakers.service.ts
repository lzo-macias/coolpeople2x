/**
 * Icebreakers Service
 * Business logic for icebreaker management
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import type {
  IcebreakerResponse,
  CreateIcebreakerRequest,
  UpdateIcebreakerRequest,
} from './icebreakers.types.js';

// -----------------------------------------------------------------------------
// Get User's Icebreakers
// -----------------------------------------------------------------------------

export const getUserIcebreakers = async (userId: string): Promise<IcebreakerResponse[]> => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const icebreakers = await prisma.icebreaker.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  });

  return icebreakers.map(formatIcebreaker);
};

// -----------------------------------------------------------------------------
// Create Icebreaker
// -----------------------------------------------------------------------------

export const createIcebreaker = async (
  userId: string,
  requesterId: string,
  data: CreateIcebreakerRequest
): Promise<IcebreakerResponse> => {
  // Users can only create icebreakers for themselves
  if (userId !== requesterId) {
    throw new ForbiddenError('You can only create icebreakers for your own profile');
  }

  // Get max sortOrder
  const maxOrder = await prisma.icebreaker.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  const icebreaker = await prisma.icebreaker.create({
    data: {
      userId,
      type: data.type,
      prompt: data.prompt,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      textResponse: data.textResponse,
      tagsResponse: data.tagsResponse ?? [],
      sliderResponse: data.sliderResponse,
      videoUrl: data.videoUrl,
      gameOptions: data.gameOptions ?? [],
      gameAnswer: data.gameAnswer,
    },
  });

  return formatIcebreaker(icebreaker);
};

// -----------------------------------------------------------------------------
// Update Icebreaker
// -----------------------------------------------------------------------------

export const updateIcebreaker = async (
  userId: string,
  icebreakerId: string,
  requesterId: string,
  data: UpdateIcebreakerRequest
): Promise<IcebreakerResponse> => {
  // Verify ownership
  if (userId !== requesterId) {
    throw new ForbiddenError('You can only update your own icebreakers');
  }

  const icebreaker = await prisma.icebreaker.findUnique({
    where: { id: icebreakerId },
  });

  if (!icebreaker || icebreaker.userId !== userId) {
    throw new NotFoundError('Icebreaker');
  }

  const updated = await prisma.icebreaker.update({
    where: { id: icebreakerId },
    data: {
      ...(data.prompt && { prompt: data.prompt }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.textResponse !== undefined && { textResponse: data.textResponse }),
      ...(data.tagsResponse && { tagsResponse: data.tagsResponse }),
      ...(data.sliderResponse !== undefined && { sliderResponse: data.sliderResponse }),
      ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
      ...(data.gameOptions && { gameOptions: data.gameOptions }),
      ...(data.gameAnswer !== undefined && { gameAnswer: data.gameAnswer }),
    },
  });

  return formatIcebreaker(updated);
};

// -----------------------------------------------------------------------------
// Delete Icebreaker
// -----------------------------------------------------------------------------

export const deleteIcebreaker = async (
  userId: string,
  icebreakerId: string,
  requesterId: string
): Promise<void> => {
  // Verify ownership
  if (userId !== requesterId) {
    throw new ForbiddenError('You can only delete your own icebreakers');
  }

  const icebreaker = await prisma.icebreaker.findUnique({
    where: { id: icebreakerId },
  });

  if (!icebreaker || icebreaker.userId !== userId) {
    throw new NotFoundError('Icebreaker');
  }

  await prisma.icebreaker.delete({
    where: { id: icebreakerId },
  });
};

// -----------------------------------------------------------------------------
// Reorder Icebreakers
// -----------------------------------------------------------------------------

export const reorderIcebreakers = async (
  userId: string,
  requesterId: string,
  icebreakers: { id: string; sortOrder: number }[]
): Promise<IcebreakerResponse[]> => {
  // Verify ownership
  if (userId !== requesterId) {
    throw new ForbiddenError('You can only reorder your own icebreakers');
  }

  // Verify all icebreakers belong to user
  const existing = await prisma.icebreaker.findMany({
    where: {
      userId,
      id: { in: icebreakers.map((i) => i.id) },
    },
    select: { id: true },
  });

  if (existing.length !== icebreakers.length) {
    throw new NotFoundError('One or more icebreakers');
  }

  // Update all in transaction
  await prisma.$transaction(
    icebreakers.map((item) =>
      prisma.icebreaker.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  return getUserIcebreakers(userId);
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const formatIcebreaker = (icebreaker: {
  id: string;
  type: string;
  prompt: string;
  sortOrder: number;
  createdAt: Date;
  textResponse: string | null;
  tagsResponse: string[];
  sliderResponse: number | null;
  videoUrl: string | null;
  gameOptions: string[];
  gameAnswer: number | null;
}): IcebreakerResponse => ({
  id: icebreaker.id,
  type: icebreaker.type as IcebreakerResponse['type'],
  prompt: icebreaker.prompt,
  sortOrder: icebreaker.sortOrder,
  createdAt: icebreaker.createdAt,
  textResponse: icebreaker.textResponse,
  tagsResponse: icebreaker.tagsResponse,
  sliderResponse: icebreaker.sliderResponse,
  videoUrl: icebreaker.videoUrl,
  gameOptions: icebreaker.gameOptions,
  gameAnswer: icebreaker.gameAnswer,
});
