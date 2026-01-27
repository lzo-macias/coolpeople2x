/**
 * Comments Controller
 * HTTP request handlers for comment management
 */

import type { Request, Response } from 'express';
import * as commentsService from './comments.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/reels/:reelId/comments
// -----------------------------------------------------------------------------

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const reelId = req.params.reelId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await commentsService.getComments(
    reelId,
    req.user?.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.comments, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:reelId/comments
// -----------------------------------------------------------------------------

export const createComment = async (req: Request, res: Response): Promise<void> => {
  const reelId = req.params.reelId as string;
  const comment = await commentsService.createComment(
    reelId,
    req.user!.userId,
    req.body
  );
  sendCreated(res, { comment });
};

// -----------------------------------------------------------------------------
// DELETE /api/comments/:commentId
// -----------------------------------------------------------------------------

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  const commentId = req.params.commentId as string;
  await commentsService.deleteComment(commentId, req.user!.userId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/comments/:commentId/like
// -----------------------------------------------------------------------------

export const likeComment = async (req: Request, res: Response): Promise<void> => {
  const commentId = req.params.commentId as string;
  await commentsService.likeComment(commentId, req.user!.userId);
  sendSuccess(res, { liked: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/comments/:commentId/like
// -----------------------------------------------------------------------------

export const unlikeComment = async (req: Request, res: Response): Promise<void> => {
  const commentId = req.params.commentId as string;
  await commentsService.unlikeComment(commentId, req.user!.userId);
  sendSuccess(res, { liked: false });
};
