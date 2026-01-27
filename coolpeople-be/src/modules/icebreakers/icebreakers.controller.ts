/**
 * Icebreakers Controller
 * HTTP request handlers for icebreaker management
 */

import type { Request, Response } from 'express';
import * as icebreakersService from './icebreakers.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/users/:userId/icebreakers
// -----------------------------------------------------------------------------

export const getIcebreakers = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const icebreakers = await icebreakersService.getUserIcebreakers(userId);
  sendSuccess(res, { icebreakers });
};

// -----------------------------------------------------------------------------
// POST /api/users/:userId/icebreakers
// -----------------------------------------------------------------------------

export const createIcebreaker = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const requesterId = req.user!.userId;

  const icebreaker = await icebreakersService.createIcebreaker(userId, requesterId, req.body);
  sendCreated(res, { icebreaker });
};

// -----------------------------------------------------------------------------
// PATCH /api/users/:userId/icebreakers/:icebreakerId
// -----------------------------------------------------------------------------

export const updateIcebreaker = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const icebreakerId = req.params.icebreakerId as string;
  const requesterId = req.user!.userId;

  const icebreaker = await icebreakersService.updateIcebreaker(
    userId,
    icebreakerId,
    requesterId,
    req.body
  );
  sendSuccess(res, { icebreaker });
};

// -----------------------------------------------------------------------------
// DELETE /api/users/:userId/icebreakers/:icebreakerId
// -----------------------------------------------------------------------------

export const deleteIcebreaker = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const icebreakerId = req.params.icebreakerId as string;
  const requesterId = req.user!.userId;

  await icebreakersService.deleteIcebreaker(userId, icebreakerId, requesterId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// PUT /api/users/:userId/icebreakers/reorder
// -----------------------------------------------------------------------------

export const reorderIcebreakers = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const requesterId = req.user!.userId;

  const icebreakers = await icebreakersService.reorderIcebreakers(
    userId,
    requesterId,
    req.body.icebreakers
  );
  sendSuccess(res, { icebreakers });
};
