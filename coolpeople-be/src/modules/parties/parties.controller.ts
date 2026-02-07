/**
 * Parties Controller
 * HTTP request handlers for party management
 */

import type { Request, Response } from 'express';
import * as partiesService from './parties.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// =============================================================================
// PARTY NAME/HANDLE AVAILABILITY
// =============================================================================

// GET /api/parties/check-name
export const checkPartyName = async (req: Request, res: Response): Promise<void> => {
  const { name, handle } = req.query as { name?: string; handle?: string };
  const result = await partiesService.checkPartyNameAvailability(name, handle);
  sendSuccess(res, result);
};

// =============================================================================
// ORPHANED PARTY CLEANUP
// =============================================================================

// POST /api/parties/cleanup-orphaned (admin/maintenance endpoint)
export const cleanupOrphanedParties = async (req: Request, res: Response): Promise<void> => {
  const result = await partiesService.cleanupOrphanedParties();
  sendSuccess(res, result);
};

// =============================================================================
// PARTY CRUD
// =============================================================================

// POST /api/parties
export const createParty = async (req: Request, res: Response): Promise<void> => {
  const party = await partiesService.createParty(req.body, req.user!.userId);
  sendCreated(res, { party });
};

// GET /api/parties
export const listParties = async (req: Request, res: Response): Promise<void> => {
  const { search, cursor, limit } = req.query as {
    search?: string;
    cursor?: string;
    limit: string;
  };

  const result = await partiesService.listParties(
    { search },
    cursor,
    parseInt(limit) || 20,
    req.user?.userId
  );

  sendPaginated(res, result.parties, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// GET /api/parties/:id
export const getParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const party = await partiesService.getParty(id, req.user?.userId);
  sendSuccess(res, { party });
};

// GET /api/parties/by-handle/:handle
export const getPartyByHandle = async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const party = await partiesService.getPartyByHandle(handle, req.user?.userId);
  sendSuccess(res, { party });
};

// PATCH /api/parties/:id
export const updateParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const party = await partiesService.updateParty(id, req.body);
  sendSuccess(res, { party });
};

// DELETE /api/parties/:id
export const deleteParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await partiesService.deleteParty(id);
  sendNoContent(res);
};

// =============================================================================
// FOLLOW / UNFOLLOW
// =============================================================================

// POST /api/parties/:id/follow
export const followParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await partiesService.followParty(req.user!.userId, id);
  sendSuccess(res, { following: true });
};

// DELETE /api/parties/:id/follow
export const unfollowParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await partiesService.unfollowParty(req.user!.userId, id);
  sendSuccess(res, { following: false });
};

// =============================================================================
// MEMBERSHIP
// =============================================================================

// POST /api/parties/:id/join
export const joinParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const asAdmin = req.body?.asAdmin === true;
  const result = await partiesService.joinParty(req.user!.userId, id, asAdmin);
  if (result.joined) {
    sendCreated(res, { joined: true, requested: false, upgraded: result.upgraded || false });
  } else {
    sendCreated(res, { joined: false, requested: true });
  }
};

// DELETE /api/parties/:id/leave
export const leaveParty = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await partiesService.leaveParty(req.user!.userId, id);
  sendNoContent(res);
};

// GET /api/parties/:id/members
export const listMembers = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.listMembers(
    id,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.members, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// PATCH /api/parties/:id/members/:userId
export const updateMemberPermissions = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  const member = await partiesService.updateMemberPermissions(
    id,
    userId,
    req.user!.userId,
    req.body
  );
  sendSuccess(res, { member });
};

// DELETE /api/parties/:id/members/:userId
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  await partiesService.removeMember(id, userId, req.user!.userId);
  sendNoContent(res);
};

// =============================================================================
// BANS
// =============================================================================

// POST /api/parties/:id/bans/:userId
export const banMember = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  const reason = req.body?.reason;
  await partiesService.banMember(id, userId, req.user!.userId, reason);
  sendCreated(res, { banned: true });
};

// DELETE /api/parties/:id/bans/:userId
export const unbanMember = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  await partiesService.unbanMember(id, userId, req.user!.userId);
  sendNoContent(res);
};

// GET /api/parties/:id/bans
export const listBannedMembers = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.listBannedMembers(
    id,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.bans, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// =============================================================================
// JOIN REQUESTS
// =============================================================================

// GET /api/parties/:id/join-requests
export const listJoinRequests = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.listJoinRequests(
    id,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.requests, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// POST /api/parties/:id/join-requests/:requestId/approve
export const approveJoinRequest = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestId = req.params.requestId as string;
  await partiesService.approveJoinRequest(id, requestId);
  sendSuccess(res, { approved: true });
};

// POST /api/parties/:id/join-requests/:requestId/deny
export const denyJoinRequest = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestId = req.params.requestId as string;
  await partiesService.denyJoinRequest(id, requestId);
  sendSuccess(res, { denied: true });
};

// =============================================================================
// GROUP CHAT
// =============================================================================

// GET /api/parties/:id/chat/messages
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.getChatMessages(
    id,
    req.user!.userId,
    cursor,
    parseInt(limit) || 50
  );
  sendPaginated(res, result.messages, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// POST /api/parties/:id/chat/messages
export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const message = await partiesService.sendChatMessage(
    id,
    req.user!.userId,
    req.body.content,
    req.body.metadata
  );
  sendCreated(res, { message });
};

// DELETE /api/parties/:id/chat/messages/:messageId
export const deleteChatMessage = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const messageId = req.params.messageId as string;
  await partiesService.deleteChatMessage(id, messageId, req.user!.userId);
  sendNoContent(res);
};

// POST /api/parties/:id/chat/messages/:messageId/reactions
export const addReaction = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const messageId = req.params.messageId as string;
  await partiesService.addReaction(id, messageId, req.user!.userId, req.body.emoji);
  sendCreated(res, { reacted: true });
};

// DELETE /api/parties/:id/chat/messages/:messageId/reactions/:emoji
export const removeReaction = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const messageId = req.params.messageId as string;
  const emoji = req.params.emoji as string;
  await partiesService.removeReaction(id, messageId, req.user!.userId, emoji);
  sendNoContent(res);
};

// =============================================================================
// FOLLOWERS
// =============================================================================

// GET /api/parties/:id/followers
export const listFollowers = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.listFollowers(
    id,
    cursor,
    parseInt(limit) || 20,
    req.user?.userId
  );
  sendPaginated(res, result.followers, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// =============================================================================
// PARTY RACES
// =============================================================================

// GET /api/parties/:id/races
export const listPartyRaces = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const races = await partiesService.listPartyRaces(id);
  sendSuccess(res, { races });
};

// =============================================================================
// PARTY REVIEWS
// =============================================================================

// GET /api/parties/:id/reviews
export const listPartyReviews = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await partiesService.listPartyReviews(
    id,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reviews, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
    averageRating: result.averageRating,
  } as any);
};

// =============================================================================
// FULL PARTY PROFILE
// =============================================================================

// GET /api/parties/:id/profile
export const getFullPartyProfile = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const party = await partiesService.getFullPartyProfile(id, req.user?.userId);
  sendSuccess(res, { party });
};
