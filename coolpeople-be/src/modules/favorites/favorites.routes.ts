/**
 * Favorites Routes
 * Mounted at two locations:
 *   /api/users/:id/favorite (for favorite/unfavorite actions)
 *   /api/me/favorites (for listing current user's favorites)
 */

import { Router } from 'express';
import * as favoritesController from './favorites.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  favoriteUserParamSchema,
  favoritesListQuerySchema,
} from './favorites.schemas.js';

// -----------------------------------------------------------------------------
// Action routes: /api/users/:id/favorite
// -----------------------------------------------------------------------------

export const favoritesActionRouter = Router({ mergeParams: true });

// POST /api/users/:id/favorite
favoritesActionRouter.post(
  '/',
  requireAuth,
  validate(favoriteUserParamSchema),
  favoritesController.favoriteUser
);

// DELETE /api/users/:id/favorite
favoritesActionRouter.delete(
  '/',
  requireAuth,
  validate(favoriteUserParamSchema),
  favoritesController.unfavoriteUser
);

// -----------------------------------------------------------------------------
// List routes: /api/me/favorites
// -----------------------------------------------------------------------------

export const favoritesListRouter = Router();

// GET /api/me/favorites
favoritesListRouter.get(
  '/',
  requireAuth,
  validate(favoritesListQuerySchema),
  favoritesController.getFavorites
);
