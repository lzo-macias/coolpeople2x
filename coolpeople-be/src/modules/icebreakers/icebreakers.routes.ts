/**
 * Icebreakers Routes
 * /api/users/:userId/icebreakers/*
 *
 * These routes are mounted under the users router
 */

import { Router } from 'express';
import * as icebreakersController from './icebreakers.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  getIcebreakersSchema,
  createIcebreakerSchema,
  updateIcebreakerSchema,
  deleteIcebreakerSchema,
  reorderIcebreakersSchema,
} from './icebreakers.schemas.js';

const router = Router({ mergeParams: true }); // mergeParams to access :userId from parent

// -----------------------------------------------------------------------------
// Public Routes
// -----------------------------------------------------------------------------

// GET /api/users/:userId/icebreakers - Get user's icebreakers
router.get('/', validate(getIcebreakersSchema), icebreakersController.getIcebreakers);

// -----------------------------------------------------------------------------
// Protected Routes
// -----------------------------------------------------------------------------

// POST /api/users/:userId/icebreakers - Create icebreaker
router.post(
  '/',
  requireAuth,
  validate(createIcebreakerSchema),
  icebreakersController.createIcebreaker
);

// PUT /api/users/:userId/icebreakers/reorder - Reorder icebreakers
router.put(
  '/reorder',
  requireAuth,
  validate(reorderIcebreakersSchema),
  icebreakersController.reorderIcebreakers
);

// PATCH /api/users/:userId/icebreakers/:icebreakerId - Update icebreaker
router.patch(
  '/:icebreakerId',
  requireAuth,
  validate(updateIcebreakerSchema),
  icebreakersController.updateIcebreaker
);

// DELETE /api/users/:userId/icebreakers/:icebreakerId - Delete icebreaker
router.delete(
  '/:icebreakerId',
  requireAuth,
  validate(deleteIcebreakerSchema),
  icebreakersController.deleteIcebreaker
);

export default router;
