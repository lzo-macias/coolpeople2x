/**
 * Blocking Controller
 * HTTP request handlers for user blocking
 */

import type { Request, Response } from 'express';
import * as blockingService from './blocking.service.js';
import { sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/users/:id/block - Block a user
// -----------------------------------------------------------------------------

export const blockUser = async (req: Request, res: Response): Promise<void> => {
  const blockedId = req.params.id as string;
  const blockerId = req.user!.userId;

  const block = await blockingService.blockUser(blockerId, blockedId);
  sendCreated(res, { block });
};

// -----------------------------------------------------------------------------
// DELETE /api/users/:id/block - Unblock a user
// -----------------------------------------------------------------------------

export const unblockUser = async (req: Request, res: Response): Promise<void> => {
  const blockedId = req.params.id as string;
  const blockerId = req.user!.userId;

  await blockingService.unblockUser(blockerId, blockedId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// GET /api/me/blocked - Get current user's blocked list
// -----------------------------------------------------------------------------

export const getBlockedUsers = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };

  const result = await blockingService.getBlockedUsers(
    userId,
    parseInt(limit) || 20,
    cursor
  );

  sendPaginated(res, result.blockedUsers, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};
