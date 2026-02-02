/**
 * Parties Routes
 * /api/parties/*
 */

import { Router } from 'express';
import * as partiesController from './parties.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requirePartyPermission } from './parties.middleware.js';
import {
  partyIdParamSchema,
  partyHandleParamSchema,
  partyMemberParamSchema,
  joinRequestParamSchema,
  chatMessageParamSchema,
  chatReactionParamSchema,
  createPartySchema,
  updatePartySchema,
  listPartiesQuerySchema,
  listMembersQuerySchema,
  updateMemberPermissionsSchema,
  sendMessageSchema,
  chatMessagesQuerySchema,
  addReactionSchema,
} from './parties.schemas.js';

const router = Router();

// =============================================================================
// PARTY NAME/HANDLE AVAILABILITY CHECK
// =============================================================================

// GET /api/parties/check-name - Check if party name/handle is available
router.get(
  '/check-name',
  optionalAuth,
  partiesController.checkPartyName
);

// =============================================================================
// ORPHANED PARTY CLEANUP
// =============================================================================

// POST /api/parties/cleanup-orphaned - Clean up orphaned parties (maintenance)
router.post(
  '/cleanup-orphaned',
  requireAuth,
  partiesController.cleanupOrphanedParties
);

// =============================================================================
// PARTY CRUD
// =============================================================================

// POST /api/parties - Create party
router.post(
  '/',
  requireAuth,
  validate(createPartySchema),
  partiesController.createParty
);

// GET /api/parties - List/search parties
router.get(
  '/',
  optionalAuth,
  validate(listPartiesQuerySchema),
  partiesController.listParties
);

// GET /api/parties/by-handle/:handle - Get party by handle (must be before /:id)
router.get(
  '/by-handle/:handle',
  optionalAuth,
  validate(partyHandleParamSchema),
  partiesController.getPartyByHandle
);

// GET /api/parties/:id - Get party details
router.get(
  '/:id',
  optionalAuth,
  validate(partyIdParamSchema),
  partiesController.getParty
);

// PATCH /api/parties/:id - Update party (admin only)
router.patch(
  '/:id',
  requireAuth,
  validate(updatePartySchema),
  requirePartyPermission('admin'),
  partiesController.updateParty
);

// DELETE /api/parties/:id - Soft delete party (admin only)
router.delete(
  '/:id',
  requireAuth,
  validate(partyIdParamSchema),
  requirePartyPermission('admin'),
  partiesController.deleteParty
);

// =============================================================================
// FOLLOW / UNFOLLOW
// =============================================================================

// POST /api/parties/:id/follow
router.post(
  '/:id/follow',
  requireAuth,
  validate(partyIdParamSchema),
  partiesController.followParty
);

// DELETE /api/parties/:id/follow
router.delete(
  '/:id/follow',
  requireAuth,
  validate(partyIdParamSchema),
  partiesController.unfollowParty
);

// =============================================================================
// MEMBERSHIP
// =============================================================================

// POST /api/parties/:id/join
router.post(
  '/:id/join',
  requireAuth,
  validate(partyIdParamSchema),
  partiesController.joinParty
);

// DELETE /api/parties/:id/leave
router.delete(
  '/:id/leave',
  requireAuth,
  validate(partyIdParamSchema),
  partiesController.leaveParty
);

// GET /api/parties/:id/members
router.get(
  '/:id/members',
  optionalAuth,
  validate(listMembersQuerySchema),
  partiesController.listMembers
);

// PATCH /api/parties/:id/members/:userId - Update permissions (admin only)
router.patch(
  '/:id/members/:userId',
  requireAuth,
  validate(updateMemberPermissionsSchema),
  requirePartyPermission('admin'),
  partiesController.updateMemberPermissions
);

// DELETE /api/parties/:id/members/:userId - Remove member (admin/moderate)
router.delete(
  '/:id/members/:userId',
  requireAuth,
  validate(partyMemberParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.removeMember
);

// =============================================================================
// BANS
// =============================================================================

// POST /api/parties/:id/bans/:userId - Ban member (admin/moderate)
router.post(
  '/:id/bans/:userId',
  requireAuth,
  validate(partyMemberParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.banMember
);

// DELETE /api/parties/:id/bans/:userId - Unban member (admin/moderate)
router.delete(
  '/:id/bans/:userId',
  requireAuth,
  validate(partyMemberParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.unbanMember
);

// GET /api/parties/:id/bans - List banned members (admin/moderate)
router.get(
  '/:id/bans',
  requireAuth,
  validate(listMembersQuerySchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.listBannedMembers
);

// =============================================================================
// JOIN REQUESTS (Private Parties)
// =============================================================================

// GET /api/parties/:id/join-requests - List pending (admin/moderate)
router.get(
  '/:id/join-requests',
  requireAuth,
  validate(partyIdParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.listJoinRequests
);

// POST /api/parties/:id/join-requests/:requestId/approve (admin/moderate)
router.post(
  '/:id/join-requests/:requestId/approve',
  requireAuth,
  validate(joinRequestParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.approveJoinRequest
);

// POST /api/parties/:id/join-requests/:requestId/deny (admin/moderate)
router.post(
  '/:id/join-requests/:requestId/deny',
  requireAuth,
  validate(joinRequestParamSchema),
  requirePartyPermission('admin', 'moderate'),
  partiesController.denyJoinRequest
);

// =============================================================================
// GROUP CHAT
// =============================================================================

// GET /api/parties/:id/chat/messages - Get messages (member required)
router.get(
  '/:id/chat/messages',
  requireAuth,
  validate(chatMessagesQuerySchema),
  requirePartyPermission('view'),
  partiesController.getChatMessages
);

// POST /api/parties/:id/chat/messages - Send message (chat mode enforced in service)
router.post(
  '/:id/chat/messages',
  requireAuth,
  validate(sendMessageSchema),
  requirePartyPermission('view'),
  partiesController.sendChatMessage
);

// DELETE /api/parties/:id/chat/messages/:messageId - Delete message
router.delete(
  '/:id/chat/messages/:messageId',
  requireAuth,
  validate(chatMessageParamSchema),
  requirePartyPermission('view'),
  partiesController.deleteChatMessage
);

// POST /api/parties/:id/chat/messages/:messageId/reactions - Add reaction
router.post(
  '/:id/chat/messages/:messageId/reactions',
  requireAuth,
  validate(addReactionSchema),
  requirePartyPermission('view'),
  partiesController.addReaction
);

// DELETE /api/parties/:id/chat/messages/:messageId/reactions/:emoji - Remove reaction
router.delete(
  '/:id/chat/messages/:messageId/reactions/:emoji',
  requireAuth,
  validate(chatReactionParamSchema),
  requirePartyPermission('view'),
  partiesController.removeReaction
);

// =============================================================================
// FOLLOWERS
// =============================================================================

// GET /api/parties/:id/followers - List followers
router.get(
  '/:id/followers',
  optionalAuth,
  validate(listMembersQuerySchema),
  partiesController.listFollowers
);

// =============================================================================
// PARTY RACES
// =============================================================================

// GET /api/parties/:id/races - Get races party is competing in
router.get(
  '/:id/races',
  optionalAuth,
  validate(partyIdParamSchema),
  partiesController.listPartyRaces
);

// =============================================================================
// PARTY REVIEWS
// =============================================================================

// GET /api/parties/:id/reviews - List reviews for party
router.get(
  '/:id/reviews',
  optionalAuth,
  validate(listMembersQuerySchema),
  partiesController.listPartyReviews
);

// =============================================================================
// FULL PARTY PROFILE
// =============================================================================

// GET /api/parties/:id/profile - Get full party profile data
router.get(
  '/:id/profile',
  optionalAuth,
  validate(partyIdParamSchema),
  partiesController.getFullPartyProfile
);

export default router;
