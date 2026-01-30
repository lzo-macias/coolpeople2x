/**
 * Reels Controller
 * HTTP request handlers for reel management and engagement
 */

import type { Request, Response } from 'express';
import * as reelsService from './reels.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/reels
// -----------------------------------------------------------------------------

export const createReel = async (req: Request, res: Response): Promise<void> => {
  const reel = await reelsService.createReel(req.user!.userId, req.body);
  sendCreated(res, { reel });
};

// -----------------------------------------------------------------------------
// GET /api/reels/:id
// -----------------------------------------------------------------------------

export const getReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const reel = await reelsService.getReel(id, req.user?.userId);
  sendSuccess(res, { reel });
};

// -----------------------------------------------------------------------------
// DELETE /api/reels/:id
// -----------------------------------------------------------------------------

export const deleteReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.deleteReel(id, req.user!.userId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// GET /api/reels/user/:userId
// -----------------------------------------------------------------------------

export const getUserReels = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reelsService.getUserReels(
    userId,
    req.user?.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reels, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/reels/party/:partyId
// -----------------------------------------------------------------------------

export const getPartyReels = async (req: Request, res: Response): Promise<void> => {
  const partyId = req.params.partyId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reelsService.getPartyReels(
    partyId,
    req.user?.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reels, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/reels/user/:userId/reposts
// -----------------------------------------------------------------------------

export const getUserReposts = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reelsService.getUserReposts(
    userId,
    req.user?.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reels, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/reels/feed
// -----------------------------------------------------------------------------

export const getFeed = async (req: Request, res: Response): Promise<void> => {
  const { type, cursor, limit } = req.query as {
    type: string;
    cursor?: string;
    limit: string;
  };

  if (type === 'discover') {
    // Post-MVP: return empty for now
    sendPaginated(res, [], { hasMore: false });
    return;
  }

  const result = await reelsService.getFollowingFeed(
    req.user!.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reels, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/like
// -----------------------------------------------------------------------------

export const likeReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.likeReel(id, req.user!.userId);
  sendSuccess(res, { liked: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/reels/:id/like
// -----------------------------------------------------------------------------

export const unlikeReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.unlikeReel(id, req.user!.userId);
  sendSuccess(res, { liked: false });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/save
// -----------------------------------------------------------------------------

export const saveReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.saveReel(id, req.user!.userId);
  sendSuccess(res, { saved: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/reels/:id/save
// -----------------------------------------------------------------------------

export const unsaveReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.unsaveReel(id, req.user!.userId);
  sendSuccess(res, { saved: false });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/share
// -----------------------------------------------------------------------------

export const shareReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.shareReel(id, req.user!.userId);
  sendSuccess(res, { shared: true });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/repost
// -----------------------------------------------------------------------------

export const repostReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.repostReel(id, req.user!.userId);
  sendSuccess(res, { reposted: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/reels/:id/repost
// -----------------------------------------------------------------------------

export const unrepostReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.unrepostReel(id, req.user!.userId);
  sendSuccess(res, { reposted: false });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/view
// -----------------------------------------------------------------------------

export const recordView = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.recordView(id, req.user!.userId, req.body.watchPercent);
  sendSuccess(res, { viewed: true });
};

// -----------------------------------------------------------------------------
// POST /api/reels/:id/hide
// -----------------------------------------------------------------------------

export const hideReel = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await reelsService.hideReel(id, req.user!.userId);
  sendSuccess(res, { hidden: true });
};

// -----------------------------------------------------------------------------
// POST /api/reels/hide-user
// -----------------------------------------------------------------------------

export const hideUser = async (req: Request, res: Response): Promise<void> => {
  await reelsService.hideUser(req.body.hiddenUserId, req.user!.userId);
  sendSuccess(res, { hidden: true });
};
