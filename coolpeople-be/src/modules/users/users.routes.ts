/**
 * Users Routes
 * /api/users/*
 */

import { Router } from 'express';
import * as usersController from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import {
  userIdParamSchema,
  usernameParamSchema,
  updateProfileSchema,
  becomeCandidateSchema,
  searchUsersSchema,
  togglePrivacySchema,
  followRequestParamSchema,
} from './users.schemas.js';
import { icebreakersRoutes } from '../icebreakers/index.js';

const router = Router();

// -----------------------------------------------------------------------------
// Public Routes (optional auth for own profile detection)
// -----------------------------------------------------------------------------

// GET /api/users/search - Search users
router.get(
  '/search',
  validate(searchUsersSchema),
  usersController.searchUsers
);

// GET /api/users/username/:username - Get user by username
router.get(
  '/username/:username',
  optionalAuth,
  validate(usernameParamSchema),
  usersController.getUserByUsername
);

// GET /api/users/:id - Get user by ID
router.get(
  '/:id',
  optionalAuth,
  validate(userIdParamSchema),
  usersController.getUser
);

// -----------------------------------------------------------------------------
// Protected Routes
// -----------------------------------------------------------------------------

// PATCH /api/users/:id - Update profile
router.patch(
  '/:id',
  requireAuth,
  validate(userIdParamSchema),
  validate(updateProfileSchema),
  usersController.updateUser
);

// PATCH /api/users/:id/privacy - Toggle private/public
router.patch(
  '/:id/privacy',
  requireAuth,
  validate(userIdParamSchema),
  validate(togglePrivacySchema),
  usersController.togglePrivacy
);

// POST /api/users/:id/media-access - Grant media library access
router.post(
  '/:id/media-access',
  requireAuth,
  validate(userIdParamSchema),
  usersController.grantMediaAccess
);

// GET /api/users/:id/follow-requests - List pending follow requests
router.get(
  '/:id/follow-requests',
  requireAuth,
  validate(userIdParamSchema),
  usersController.getFollowRequests
);

// POST /api/users/:id/follow-requests/:requestId/approve - Approve follow request
router.post(
  '/:id/follow-requests/:requestId/approve',
  requireAuth,
  validate(followRequestParamSchema),
  usersController.approveFollowRequest
);

// POST /api/users/:id/follow-requests/:requestId/deny - Deny follow request
router.post(
  '/:id/follow-requests/:requestId/deny',
  requireAuth,
  validate(followRequestParamSchema),
  usersController.denyFollowRequest
);

// GET /api/users/:id/followers - Get user's followers list
router.get(
  '/:id/followers',
  optionalAuth,
  validate(userIdParamSchema),
  usersController.getFollowers
);

// GET /api/users/:id/following - Get user's following list
router.get(
  '/:id/following',
  optionalAuth,
  validate(userIdParamSchema),
  usersController.getFollowing
);

// POST /api/users/:id/follow - Follow user
router.post(
  '/:id/follow',
  requireAuth,
  validate(userIdParamSchema),
  usersController.followUser
);

// DELETE /api/users/:id/follow - Unfollow user
router.delete(
  '/:id/follow',
  requireAuth,
  validate(userIdParamSchema),
  usersController.unfollowUser
);

// POST /api/users/:id/become-candidate - Upgrade to candidate
router.post(
  '/:id/become-candidate',
  requireAuth,
  validate(userIdParamSchema),
  validate(becomeCandidateSchema),
  usersController.becomeCandidate
);

// POST /api/users/:id/revert-participant - Revert to participant
router.post(
  '/:id/revert-participant',
  requireAuth,
  validate(userIdParamSchema),
  usersController.revertToParticipant
);

// DELETE /api/users/:id - Delete account
router.delete(
  '/:id',
  requireAuth,
  validate(userIdParamSchema),
  usersController.deleteUser
);

// -----------------------------------------------------------------------------
// Icebreakers Sub-Routes
// -----------------------------------------------------------------------------

router.use('/:userId/icebreakers', icebreakersRoutes);

export default router;
