/**
 * Reviews Controller
 * HTTP request handlers for review management
 */

import type { Request, Response } from 'express';
import * as reviewsService from './reviews.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/users/:userId/reviews
// -----------------------------------------------------------------------------

export const createUserReview = async (req: Request, res: Response): Promise<void> => {
  const targetUserId = req.params.userId as string;
  const review = await reviewsService.createUserReview(
    targetUserId,
    req.user!.userId,
    req.body
  );
  sendCreated(res, { review });
};

// -----------------------------------------------------------------------------
// GET /api/users/:userId/reviews
// -----------------------------------------------------------------------------

export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  const targetUserId = req.params.userId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reviewsService.getUserReviews(
    targetUserId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reviews, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/parties/:partyId/reviews
// -----------------------------------------------------------------------------

export const createPartyReview = async (req: Request, res: Response): Promise<void> => {
  const targetPartyId = req.params.partyId as string;
  const review = await reviewsService.createPartyReview(
    targetPartyId,
    req.user!.userId,
    req.body
  );
  sendCreated(res, { review });
};

// -----------------------------------------------------------------------------
// GET /api/parties/:partyId/reviews
// -----------------------------------------------------------------------------

export const getPartyReviews = async (req: Request, res: Response): Promise<void> => {
  const targetPartyId = req.params.partyId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reviewsService.getPartyReviews(
    targetPartyId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reviews, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// DELETE /api/reviews/:id
// -----------------------------------------------------------------------------

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  const reviewId = req.params.id as string;
  await reviewsService.deleteReview(reviewId, req.user!.userId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/reviews/:id/reply
// -----------------------------------------------------------------------------

export const replyToReview = async (req: Request, res: Response): Promise<void> => {
  const reviewId = req.params.id as string;
  const reply = await reviewsService.replyToReview(
    reviewId,
    req.user!.userId,
    req.body
  );
  sendCreated(res, { reply });
};

// -----------------------------------------------------------------------------
// DELETE /api/reviews/:id/reply/:replyId
// -----------------------------------------------------------------------------

export const deleteReply = async (req: Request, res: Response): Promise<void> => {
  const reviewId = req.params.id as string;
  const replyId = req.params.replyId as string;
  await reviewsService.deleteReply(reviewId, replyId, req.user!.userId);
  sendNoContent(res);
};
