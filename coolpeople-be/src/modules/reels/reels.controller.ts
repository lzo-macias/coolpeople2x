/**
 * Reels Controller
 * HTTP request handlers for reel management and engagement
 */

import type { Request, Response } from 'express';
import * as reelsService from './reels.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';
import type { CombineSegment } from './reels.types.js';

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
// GET /api/reels/user/:userId/activity
// -----------------------------------------------------------------------------

export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const { limit } = req.query as { limit?: string };
  const activities = await reelsService.getUserActivity(userId, parseInt(limit || '') || 50);
  sendSuccess(res, activities);
};

// -----------------------------------------------------------------------------
// GET /api/reels/user/:userId/tagged
// -----------------------------------------------------------------------------

export const getUserTaggedReels = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await reelsService.getUserTaggedReels(
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

// -----------------------------------------------------------------------------
// POST /api/reels/combine-videos
// -----------------------------------------------------------------------------

export const combineVideos = async (req: Request, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new ValidationError('No video files uploaded');
  }

  // Parse segments from the multipart body (sent as JSON string)
  let segments: CombineSegment[];
  try {
    segments = JSON.parse(req.body.segments);
  } catch {
    throw new ValidationError('Invalid segments JSON');
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new ValidationError('segments must be a non-empty array');
  }

  // Validate each segment has required fields
  for (const seg of segments) {
    if (typeof seg.fileIndex !== 'number' || typeof seg.startTime !== 'number' || typeof seg.endTime !== 'number') {
      throw new ValidationError('Each segment must have fileIndex, startTime, and endTime as numbers');
    }
  }

  const result = await reelsService.combineVideoSegments(files, segments);
  sendCreated(res, result);
};

// -----------------------------------------------------------------------------
// POST /api/reels/sounds/:soundId/save
// -----------------------------------------------------------------------------

export const saveSound = async (req: Request, res: Response): Promise<void> => {
  const soundId = req.params.soundId as string;
  await reelsService.saveSound(soundId, req.user!.userId);
  sendSuccess(res, { saved: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/reels/sounds/:soundId/save
// -----------------------------------------------------------------------------

export const unsaveSound = async (req: Request, res: Response): Promise<void> => {
  const soundId = req.params.soundId as string;
  await reelsService.unsaveSound(soundId, req.user!.userId);
  sendSuccess(res, { saved: false });
};

// -----------------------------------------------------------------------------
// GET /api/reels/sounds/:soundId/save
// -----------------------------------------------------------------------------

export const checkSoundSaved = async (req: Request, res: Response): Promise<void> => {
  const soundId = req.params.soundId as string;
  const saved = await reelsService.checkSoundSaved(soundId, req.user!.userId);
  sendSuccess(res, { saved });
};

// -----------------------------------------------------------------------------
// GET /api/reels/sound/:soundId
// -----------------------------------------------------------------------------

export const getReelsBySound = async (req: Request, res: Response): Promise<void> => {
  const soundId = req.params.soundId as string;
  const cursor = req.query.cursor as string | undefined;
  const result = await reelsService.getReelsBySound(soundId, req.user?.userId, cursor);
  sendSuccess(res, result);
};

// -----------------------------------------------------------------------------
// GET /api/reels/sounds
// -----------------------------------------------------------------------------

export const listSounds = async (req: Request, res: Response): Promise<void> => {
  const { tab, cursor, limit } = req.query as { tab?: string; cursor?: string; limit?: string };
  const lim = parseInt(limit || '') || 30;

  if (tab === 'trending') {
    const result = await reelsService.getTrendingSounds(lim);
    sendSuccess(res, result);
  } else if (tab === 'saved') {
    const result = await reelsService.getSavedSounds(req.user!.userId, cursor, lim);
    sendSuccess(res, result);
  } else {
    // Default: "for you"
    const result = await reelsService.getSoundsForYou(cursor, lim);
    sendSuccess(res, result);
  }
};
