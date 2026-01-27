/**
 * Comments Routes
 * Mounted at two locations:
 *   /api/reels/:reelId/comments (for reel-scoped operations)
 *   /api/comments (for comment-specific operations)
 */

import { Router } from 'express';
import * as commentsController from './comments.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import {
  reelCommentsParamSchema,
  commentIdParamSchema,
  createCommentSchema,
  commentCursorSchema,
} from './comments.schemas.js';

// -----------------------------------------------------------------------------
// Reel-scoped routes: /api/reels/:reelId/comments
// -----------------------------------------------------------------------------

export const reelCommentsRouter = Router({ mergeParams: true });

// GET /api/reels/:reelId/comments
reelCommentsRouter.get(
  '/',
  optionalAuth,
  validate(reelCommentsParamSchema),
  validate(commentCursorSchema),
  commentsController.getComments
);

// POST /api/reels/:reelId/comments
reelCommentsRouter.post(
  '/',
  requireAuth,
  validate(reelCommentsParamSchema),
  validate(createCommentSchema),
  commentsController.createComment
);

// -----------------------------------------------------------------------------
// Comment-specific routes: /api/comments
// -----------------------------------------------------------------------------

export const commentsRouter = Router();

// DELETE /api/comments/:commentId
commentsRouter.delete(
  '/:commentId',
  requireAuth,
  validate(commentIdParamSchema),
  commentsController.deleteComment
);

// POST /api/comments/:commentId/like
commentsRouter.post(
  '/:commentId/like',
  requireAuth,
  validate(commentIdParamSchema),
  commentsController.likeComment
);

// DELETE /api/comments/:commentId/like
commentsRouter.delete(
  '/:commentId/like',
  requireAuth,
  validate(commentIdParamSchema),
  commentsController.unlikeComment
);
