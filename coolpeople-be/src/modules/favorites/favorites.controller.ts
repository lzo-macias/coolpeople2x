/**
 * Favorites Controller
 * HTTP request handlers for favorite management
 */

import type { Request, Response } from 'express';
import * as favoritesService from './favorites.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/users/:id/favorite
// -----------------------------------------------------------------------------

export const favoriteUser = async (req: Request, res: Response): Promise<void> => {
  const favoritedUserId = req.params.id as string;
  const favorite = await favoritesService.favoriteUser(req.user!.userId, favoritedUserId);
  sendCreated(res, { favorite });
};

// -----------------------------------------------------------------------------
// DELETE /api/users/:id/favorite
// -----------------------------------------------------------------------------

export const unfavoriteUser = async (req: Request, res: Response): Promise<void> => {
  const favoritedUserId = req.params.id as string;
  await favoritesService.unfavoriteUser(req.user!.userId, favoritedUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// GET /api/me/favorites
// -----------------------------------------------------------------------------

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await favoritesService.getFavorites(
    req.user!.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.favorites, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};
