/**
 * Points Routes
 * /api/points/*
 */

import { Router } from 'express';
import * as pointsController from './points.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import {
  userPointsParamSchema,
  pointHistoryParamSchema,
  pointHistoryQuerySchema,
  sparklineParamSchema,
  sparklineQuerySchema,
} from './points.schemas.js';

const router = Router();

// GET /api/points/me - My point summaries
router.get(
  '/me',
  requireAuth,
  pointsController.getMyPoints
);

// GET /api/points/users/:userId - User's point summaries
router.get(
  '/users/:userId',
  optionalAuth,
  validate(userPointsParamSchema),
  pointsController.getUserPoints
);

// GET /api/points/users/:userId/history - Point event history
router.get(
  '/users/:userId/history',
  optionalAuth,
  validate(pointHistoryParamSchema),
  validate(pointHistoryQuerySchema),
  pointsController.getPointHistory
);

// GET /api/points/sparkline/:ledgerId - Sparkline data
router.get(
  '/sparkline/:ledgerId',
  optionalAuth,
  validate(sparklineParamSchema),
  validate(sparklineQuerySchema),
  pointsController.getSparkline
);

export default router;
