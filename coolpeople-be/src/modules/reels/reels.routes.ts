/**
 * Reels Routes
 * /api/reels/*
 */

import { Router } from 'express';
import * as reelsController from './reels.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { videoUpload } from '../../middleware/upload.js';
import {
  reelIdParamSchema,
  createReelSchema,
  userReelsParamSchema,
  partyReelsParamSchema,
  feedQuerySchema,
  reelEngagementParamSchema,
  watchEventSchema,
  hideReelSchema,
  hideUserSchema,
  cursorQuerySchema,
} from './reels.schemas.js';

const router = Router();

// -----------------------------------------------------------------------------
// Feed (must be before /:id to avoid route conflict)
// -----------------------------------------------------------------------------

// GET /api/reels/feed - Get personalized feed
router.get(
  '/feed',
  requireAuth,
  validate(feedQuerySchema),
  reelsController.getFeed
);

// -----------------------------------------------------------------------------
// User and Party Reels (must be before /:id)
// -----------------------------------------------------------------------------

// GET /api/reels/user/:userId - Get user's reels
router.get(
  '/user/:userId',
  optionalAuth,
  validate(userReelsParamSchema),
  validate(cursorQuerySchema),
  reelsController.getUserReels
);

// GET /api/reels/user/:userId/reposts - Get user's reposts
router.get(
  '/user/:userId/reposts',
  optionalAuth,
  validate(userReelsParamSchema),
  validate(cursorQuerySchema),
  reelsController.getUserReposts
);

// GET /api/reels/user/:userId/activity - Get user's activity (likes, comments, reposts)
router.get(
  '/user/:userId/activity',
  optionalAuth,
  validate(userReelsParamSchema),
  reelsController.getUserActivity
);

// GET /api/reels/user/:userId/tagged - Get reels where user is mentioned/tagged
router.get(
  '/user/:userId/tagged',
  optionalAuth,
  validate(userReelsParamSchema),
  validate(cursorQuerySchema),
  reelsController.getUserTaggedReels
);

// GET /api/reels/party/:partyId - Get party's reels
router.get(
  '/party/:partyId',
  optionalAuth,
  validate(partyReelsParamSchema),
  validate(cursorQuerySchema),
  reelsController.getPartyReels
);

// -----------------------------------------------------------------------------
// Hide User (no :id param)
// -----------------------------------------------------------------------------

// POST /api/reels/hide-user - Hide all reels from a user
router.post(
  '/hide-user',
  requireAuth,
  validate(hideUserSchema),
  reelsController.hideUser
);

// -----------------------------------------------------------------------------
// Sounds (must be before /:id to avoid route conflict)
// -----------------------------------------------------------------------------

// GET /api/reels/sound/:soundId - Get reels using a specific sound
router.get(
  '/sound/:soundId',
  optionalAuth,
  reelsController.getReelsBySound
);

// POST /api/reels/sounds/:soundId/save - Save a sound
router.post(
  '/sounds/:soundId/save',
  requireAuth,
  reelsController.saveSound
);

// DELETE /api/reels/sounds/:soundId/save - Unsave a sound
router.delete(
  '/sounds/:soundId/save',
  requireAuth,
  reelsController.unsaveSound
);

// -----------------------------------------------------------------------------
// Video Combine (must be before /:id to avoid route conflict)
// -----------------------------------------------------------------------------

// POST /api/reels/combine-videos - Combine multiple video segments server-side
router.post(
  '/combine-videos',
  requireAuth,
  videoUpload.array('videos', 10),
  reelsController.combineVideos
);

// -----------------------------------------------------------------------------
// CRUD
// -----------------------------------------------------------------------------

// POST /api/reels - Create a reel
router.post(
  '/',
  requireAuth,
  validate(createReelSchema),
  reelsController.createReel
);

// GET /api/reels/:id - Get a reel
router.get(
  '/:id',
  optionalAuth,
  validate(reelIdParamSchema),
  reelsController.getReel
);

// DELETE /api/reels/:id - Soft delete a reel
router.delete(
  '/:id',
  requireAuth,
  validate(reelIdParamSchema),
  reelsController.deleteReel
);

// -----------------------------------------------------------------------------
// Engagement
// -----------------------------------------------------------------------------

// POST /api/reels/:id/like
router.post(
  '/:id/like',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.likeReel
);

// DELETE /api/reels/:id/like
router.delete(
  '/:id/like',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.unlikeReel
);

// POST /api/reels/:id/save
router.post(
  '/:id/save',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.saveReel
);

// DELETE /api/reels/:id/save
router.delete(
  '/:id/save',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.unsaveReel
);

// POST /api/reels/:id/share
router.post(
  '/:id/share',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.shareReel
);

// POST /api/reels/:id/repost
router.post(
  '/:id/repost',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.repostReel
);

// DELETE /api/reels/:id/repost
router.delete(
  '/:id/repost',
  requireAuth,
  validate(reelEngagementParamSchema),
  reelsController.unrepostReel
);

// POST /api/reels/:id/view - Record watch event
router.post(
  '/:id/view',
  requireAuth,
  validate(reelEngagementParamSchema),
  validate(watchEventSchema),
  reelsController.recordView
);

// POST /api/reels/:id/hide - Hide specific reel
router.post(
  '/:id/hide',
  requireAuth,
  validate(hideReelSchema),
  reelsController.hideReel
);

export default router;
