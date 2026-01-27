/**
 * Points Controller
 * HTTP request handlers for points management
 */

import type { Request, Response } from 'express';
import * as pointsService from './points.service.js';
import { sendSuccess, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/points/me - My point summaries across all races
// -----------------------------------------------------------------------------

export const getMyPoints = async (req: Request, res: Response): Promise<void> => {
  const summaries = await pointsService.getUserPointSummary(req.user!.userId);
  sendSuccess(res, { points: summaries });
};

// -----------------------------------------------------------------------------
// GET /api/points/users/:userId - User's point summaries
// -----------------------------------------------------------------------------

export const getUserPoints = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const summaries = await pointsService.getUserPointSummary(userId);
  sendSuccess(res, { points: summaries });
};

// -----------------------------------------------------------------------------
// GET /api/points/users/:userId/history - Point event history
// -----------------------------------------------------------------------------

export const getPointHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const { raceId, period, cursor, limit } = req.query as {
    raceId?: string;
    period: string;
    cursor?: string;
    limit: string;
  };

  const result = await pointsService.getPointHistory(
    userId,
    raceId,
    period,
    cursor,
    parseInt(limit) || 20
  );

  sendPaginated(res, result.events, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/points/sparkline/:ledgerId - Sparkline data for a ledger
// -----------------------------------------------------------------------------

export const getSparkline = async (req: Request, res: Response): Promise<void> => {
  const ledgerId = req.params.ledgerId as string;
  const { period } = req.query as { period: string };

  const data = await pointsService.getSparklineData(ledgerId, period);
  sendSuccess(res, { sparkline: data });
};
