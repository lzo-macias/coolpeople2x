/**
 * Reviews Routes
 * Mounted at three locations:
 *   /api/users/:userId/reviews (for user-scoped operations)
 *   /api/parties/:partyId/reviews (for party-scoped operations)
 *   /api/reviews (for review-specific operations)
 */

import { Router } from 'express';
import * as reviewsController from './reviews.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import {
  userReviewsParamSchema,
  partyReviewsParamSchema,
  reviewIdParamSchema,
  reviewReplyParamSchema,
  createReviewSchema,
  createReplySchema,
  reviewCursorSchema,
} from './reviews.schemas.js';

// -----------------------------------------------------------------------------
// User-scoped routes: /api/users/:userId/reviews
// -----------------------------------------------------------------------------

export const userReviewsRouter = Router({ mergeParams: true });

// GET /api/users/:userId/reviews
userReviewsRouter.get(
  '/',
  optionalAuth,
  validate(userReviewsParamSchema),
  validate(reviewCursorSchema),
  reviewsController.getUserReviews
);

// POST /api/users/:userId/reviews
userReviewsRouter.post(
  '/',
  requireAuth,
  validate(userReviewsParamSchema),
  validate(createReviewSchema),
  reviewsController.createUserReview
);

// -----------------------------------------------------------------------------
// Party-scoped routes: /api/parties/:partyId/reviews
// -----------------------------------------------------------------------------

export const partyReviewsRouter = Router({ mergeParams: true });

// GET /api/parties/:partyId/reviews
partyReviewsRouter.get(
  '/',
  optionalAuth,
  validate(partyReviewsParamSchema),
  validate(reviewCursorSchema),
  reviewsController.getPartyReviews
);

// POST /api/parties/:partyId/reviews
partyReviewsRouter.post(
  '/',
  requireAuth,
  validate(partyReviewsParamSchema),
  validate(createReviewSchema),
  reviewsController.createPartyReview
);

// -----------------------------------------------------------------------------
// Review-specific routes: /api/reviews
// -----------------------------------------------------------------------------

export const reviewsRouter = Router();

// DELETE /api/reviews/:id
reviewsRouter.delete(
  '/:id',
  requireAuth,
  validate(reviewIdParamSchema),
  reviewsController.deleteReview
);

// POST /api/reviews/:id/reply
reviewsRouter.post(
  '/:id/reply',
  requireAuth,
  validate(reviewIdParamSchema),
  validate(createReplySchema),
  reviewsController.replyToReview
);

// DELETE /api/reviews/:id/reply/:replyId
reviewsRouter.delete(
  '/:id/reply/:replyId',
  requireAuth,
  validate(reviewReplyParamSchema),
  reviewsController.deleteReply
);
