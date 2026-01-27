/**
 * Favorites Service
 * Business logic for favorite management
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import type { FavoriteResponse, FavoritedUserResponse } from './favorites.types.js';

// -----------------------------------------------------------------------------
// Favorite a Candidate
// -----------------------------------------------------------------------------

export const favoriteUser = async (
  userId: string,
  favoritedUserId: string
): Promise<FavoriteResponse> => {
  // Can't favorite yourself
  if (userId === favoritedUserId) {
    throw new ForbiddenError('You cannot favorite yourself');
  }

  // Verify target user exists and is a CANDIDATE
  const targetUser = await prisma.user.findUnique({
    where: { id: favoritedUserId },
    select: { id: true, userType: true },
  });

  if (!targetUser) throw new NotFoundError('User');
  if (targetUser.userType !== 'CANDIDATE') {
    throw new ForbiddenError('Only candidates can be favorited');
  }

  // Create the favorite (unique constraint will catch duplicates)
  try {
    const favorite = await prisma.favorite.create({
      data: { userId, favoritedUserId },
    });

    return {
      id: favorite.id,
      userId: favorite.userId,
      favoritedUserId: favorite.favoritedUserId,
      createdAt: favorite.createdAt,
    };
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already favorited');
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Unfavorite a Candidate
// -----------------------------------------------------------------------------

export const unfavoriteUser = async (
  userId: string,
  favoritedUserId: string
): Promise<void> => {
  const existing = await prisma.favorite.findUnique({
    where: { userId_favoritedUserId: { userId, favoritedUserId } },
  });

  if (!existing) throw new NotFoundError('Favorite');

  await prisma.favorite.delete({ where: { id: existing.id } });
};

// -----------------------------------------------------------------------------
// Get Current User's Favorites List
// -----------------------------------------------------------------------------

export const getFavorites = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ favorites: FavoritedUserResponse[]; nextCursor: string | null }> => {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      favoritedUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          userType: true,
        },
      },
    },
  });

  const hasMore = favorites.length > limit;
  const results = hasMore ? favorites.slice(0, -1) : favorites;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    favorites: results.map((f) => ({
      id: f.id,
      favoritedUser: {
        id: f.favoritedUser.id,
        username: f.favoritedUser.username,
        displayName: f.favoritedUser.displayName,
        avatarUrl: f.favoritedUser.avatarUrl,
        userType: f.favoritedUser.userType,
      },
      createdAt: f.createdAt,
    })),
    nextCursor,
  };
};
