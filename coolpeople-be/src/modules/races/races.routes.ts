/**
 * Races Routes
 * /api/races/*
 */

import { Router } from 'express';
import * as racesController from './races.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { blockSystemRaceModification } from './races.middleware.js';
import {
  raceIdParamSchema,
  createRaceSchema,
  updateRaceSchema,
  listRacesQuerySchema,
  scoreboardQuerySchema,
  nominateSchema,
  userNominationsParamSchema,
} from './races.schemas.js';
import { ballotParamSchema, submitBallotSchema } from './ballot.schemas.js';

const router = Router();

// -----------------------------------------------------------------------------
// User Nominations (before /:id to avoid route conflict)
// -----------------------------------------------------------------------------

// GET /api/races/users/:userId/nominations - Get nominations received
router.get(
  '/users/:userId/nominations',
  optionalAuth,
  validate(userNominationsParamSchema),
  racesController.getUserNominations
);

// -----------------------------------------------------------------------------
// CRUD
// -----------------------------------------------------------------------------

// POST /api/races - Create race
router.post(
  '/',
  requireAuth,
  validate(createRaceSchema),
  racesController.createRace
);

// GET /api/races - List races
router.get(
  '/',
  optionalAuth,
  validate(listRacesQuerySchema),
  racesController.listRaces
);

// GET /api/races/:id - Get race details
router.get(
  '/:id',
  optionalAuth,
  validate(raceIdParamSchema),
  racesController.getRace
);

// PATCH /api/races/:id - Update race (blocked for system races)
router.patch(
  '/:id',
  requireAuth,
  validate(updateRaceSchema),
  blockSystemRaceModification,
  racesController.updateRace
);

// DELETE /api/races/:id - Delete race (blocked for system races)
router.delete(
  '/:id',
  requireAuth,
  validate(raceIdParamSchema),
  blockSystemRaceModification,
  racesController.deleteRace
);

// -----------------------------------------------------------------------------
// Follow / Unfollow
// -----------------------------------------------------------------------------

// POST /api/races/:id/follow
router.post(
  '/:id/follow',
  requireAuth,
  validate(raceIdParamSchema),
  racesController.followRace
);

// DELETE /api/races/:id/follow
router.delete(
  '/:id/follow',
  requireAuth,
  validate(raceIdParamSchema),
  racesController.unfollowRace
);

// -----------------------------------------------------------------------------
// Compete / Leave
// -----------------------------------------------------------------------------

// POST /api/races/:id/compete
router.post(
  '/:id/compete',
  requireAuth,
  validate(raceIdParamSchema),
  racesController.competeInRace
);

// DELETE /api/races/:id/compete
router.delete(
  '/:id/compete',
  requireAuth,
  validate(raceIdParamSchema),
  racesController.leaveRace
);

// -----------------------------------------------------------------------------
// Competitors / Scoreboard
// -----------------------------------------------------------------------------

// GET /api/races/:id/competitors
router.get(
  '/:id/competitors',
  optionalAuth,
  validate(raceIdParamSchema),
  racesController.getCompetitors
);

// GET /api/races/:id/scoreboard
router.get(
  '/:id/scoreboard',
  optionalAuth,
  validate(scoreboardQuerySchema),
  racesController.getScoreboard
);

// -----------------------------------------------------------------------------
// Nominate
// -----------------------------------------------------------------------------

// POST /api/races/:id/nominate
router.post(
  '/:id/nominate',
  requireAuth,
  validate(nominateSchema),
  racesController.nominateCandidate
);

// -----------------------------------------------------------------------------
// Ballot
// -----------------------------------------------------------------------------

// GET /api/races/:id/ballot - Get ballot status + user's vote
router.get(
  '/:id/ballot',
  requireAuth,
  validate(ballotParamSchema),
  racesController.getBallotStatus
);

// POST /api/races/:id/ballot - Submit ranked choice ballot
router.post(
  '/:id/ballot',
  requireAuth,
  validate(submitBallotSchema),
  racesController.submitBallot
);

// PATCH /api/races/:id/ballot - Update ballot (before deadline)
router.patch(
  '/:id/ballot',
  requireAuth,
  validate(submitBallotSchema),
  racesController.updateBallot
);

// GET /api/races/:id/ballot/results - Get results (after close)
router.get(
  '/:id/ballot/results',
  optionalAuth,
  validate(ballotParamSchema),
  racesController.getBallotResults
);

export default router;
