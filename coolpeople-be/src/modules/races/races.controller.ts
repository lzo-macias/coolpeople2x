/**
 * Races Controller
 * HTTP request handlers for race management
 */

import type { Request, Response } from 'express';
import * as racesService from './races.service.js';
import * as ballotService from './ballot.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/races - Create race
// -----------------------------------------------------------------------------

export const createRace = async (req: Request, res: Response): Promise<void> => {
  const race = await racesService.createRace(req.body, req.user!.userId);
  sendCreated(res, { race });
};

// -----------------------------------------------------------------------------
// GET /api/races - List races
// -----------------------------------------------------------------------------

export const listRaces = async (req: Request, res: Response): Promise<void> => {
  const { type, search, cursor, limit } = req.query as {
    type?: string;
    search?: string;
    cursor?: string;
    limit: string;
  };

  const result = await racesService.listRaces(
    { type, search },
    cursor,
    parseInt(limit) || 20,
    req.user?.userId
  );

  sendPaginated(res, result.races, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/races/:id - Get race
// -----------------------------------------------------------------------------

export const getRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const race = await racesService.getRace(id, req.user?.userId);
  sendSuccess(res, { race });
};

// -----------------------------------------------------------------------------
// PATCH /api/races/:id - Update race
// -----------------------------------------------------------------------------

export const updateRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const race = await racesService.updateRace(id, req.body);
  sendSuccess(res, { race });
};

// -----------------------------------------------------------------------------
// DELETE /api/races/:id - Delete race
// -----------------------------------------------------------------------------

export const deleteRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await racesService.deleteRace(id);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/races/:id/follow
// -----------------------------------------------------------------------------

export const followRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await racesService.followRace(req.user!.userId, id);
  sendSuccess(res, { following: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/races/:id/follow
// -----------------------------------------------------------------------------

export const unfollowRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await racesService.unfollowRace(req.user!.userId, id);
  sendSuccess(res, { following: false });
};

// -----------------------------------------------------------------------------
// POST /api/races/:id/compete
// -----------------------------------------------------------------------------

export const competeInRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await racesService.competeInRace(req.user!.userId, id);
  sendSuccess(res, { competing: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/races/:id/compete
// -----------------------------------------------------------------------------

export const leaveRace = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await racesService.leaveRace(req.user!.userId, id);
  sendSuccess(res, { competing: false });
};

// -----------------------------------------------------------------------------
// GET /api/races/:id/competitors
// -----------------------------------------------------------------------------

export const getCompetitors = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await racesService.getCompetitors(
    id,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.competitors, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// GET /api/races/:id/scoreboard
// -----------------------------------------------------------------------------

export const getScoreboard = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { period, cursor, limit } = req.query as {
    period: string;
    cursor?: string;
    limit: string;
  };
  const result = await racesService.getScoreboard(
    id,
    period,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.entries, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/races/:id/nominate
// -----------------------------------------------------------------------------

export const nominateCandidate = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const nomination = await racesService.nominateCandidate(
    req.user!.userId,
    req.body.nomineeId,
    id,
    req.body.reelId
  );
  sendCreated(res, { nomination });
};

// -----------------------------------------------------------------------------
// GET /api/races/users/:userId/nominations
// -----------------------------------------------------------------------------

export const getUserNominations = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const nominations = await racesService.getUserNominations(userId);
  sendSuccess(res, { nominations });
};

// -----------------------------------------------------------------------------
// GET /api/races/:id/ballot - Get ballot status
// -----------------------------------------------------------------------------

export const getBallotStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const status = await ballotService.getBallotStatus(id, req.user!.userId);
  sendSuccess(res, status);
};

// -----------------------------------------------------------------------------
// POST /api/races/:id/ballot - Submit ballot
// -----------------------------------------------------------------------------

export const submitBallot = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const result = await ballotService.submitBallot(id, req.user!.userId, req.body.rankings);
  sendCreated(res, result);
};

// -----------------------------------------------------------------------------
// PATCH /api/races/:id/ballot - Update ballot
// -----------------------------------------------------------------------------

export const updateBallot = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const result = await ballotService.updateBallot(id, req.user!.userId, req.body.rankings);
  sendSuccess(res, result);
};

// -----------------------------------------------------------------------------
// GET /api/races/:id/ballot/results - Get ballot results
// -----------------------------------------------------------------------------

export const getBallotResults = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const results = await ballotService.getBallotResults(id);
  sendSuccess(res, results);
};
