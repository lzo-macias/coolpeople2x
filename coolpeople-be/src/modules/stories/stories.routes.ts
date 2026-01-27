/**
 * Stories Routes
 * /api/stories/*
 */

import { Router } from 'express';
import * as storiesController from './stories.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import {
  storyIdParamSchema,
  createStorySchema,
  userStoriesParamSchema,
} from './stories.schemas.js';

const router = Router();

// -----------------------------------------------------------------------------
// Feed (must be before /:id)
// -----------------------------------------------------------------------------

// GET /api/stories/feed - Get story feed from followed users
router.get(
  '/feed',
  requireAuth,
  storiesController.getStoryFeed
);

// -----------------------------------------------------------------------------
// User Stories (must be before /:id)
// -----------------------------------------------------------------------------

// GET /api/stories/user/:userId - Get user's active stories
router.get(
  '/user/:userId',
  optionalAuth,
  validate(userStoriesParamSchema),
  storiesController.getUserStories
);

// -----------------------------------------------------------------------------
// CRUD
// -----------------------------------------------------------------------------

// POST /api/stories - Create a story
router.post(
  '/',
  requireAuth,
  validate(createStorySchema),
  storiesController.createStory
);

// GET /api/stories/:id - Get a story
router.get(
  '/:id',
  optionalAuth,
  validate(storyIdParamSchema),
  storiesController.getStory
);

// DELETE /api/stories/:id - Soft delete a story
router.delete(
  '/:id',
  requireAuth,
  validate(storyIdParamSchema),
  storiesController.deleteStory
);

// POST /api/stories/:id/view - Mark story as viewed
router.post(
  '/:id/view',
  requireAuth,
  validate(storyIdParamSchema),
  storiesController.viewStory
);

export default router;
