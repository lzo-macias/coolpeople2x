/**
 * Blocking Routes
 *
 * blockActionRouter: POST/DELETE /api/users/:id/block (mergeParams)
 * blockListRouter:   GET /api/me/blocked
 */

import { Router } from 'express';
import * as blockingController from './blocking.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { blockUserParamsSchema, getBlockedListSchema } from './blocking.schemas.js';

// -----------------------------------------------------------------------------
// Block Action Router — mounted under /api/users/:id/block
// -----------------------------------------------------------------------------

export const blockActionRouter = Router({ mergeParams: true });

// POST /api/users/:id/block - Block a user
blockActionRouter.post(
  '/',
  requireAuth,
  validate(blockUserParamsSchema),
  blockingController.blockUser
);

// DELETE /api/users/:id/block - Unblock a user
blockActionRouter.delete(
  '/',
  requireAuth,
  validate(blockUserParamsSchema),
  blockingController.unblockUser
);

// -----------------------------------------------------------------------------
// Block List Router — mounted at /api/me/blocked
// -----------------------------------------------------------------------------

export const blockListRouter = Router();

// GET /api/me/blocked - Get current user's blocked list
blockListRouter.get(
  '/',
  requireAuth,
  validate(getBlockedListSchema),
  blockingController.getBlockedUsers
);
