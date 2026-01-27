/**
 * Users Controller
 * HTTP request handlers for user management
 */

import type { Request, Response } from 'express';
import * as usersService from './users.service.js';
import { sendSuccess, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/users/:id
// -----------------------------------------------------------------------------

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  // Check if requester is viewing their own profile
  const isOwnProfile = req.user?.userId === id;

  const profile = isOwnProfile
    ? await usersService.getPrivateProfile(id)
    : await usersService.getPublicProfile(id, req.user?.userId);

  sendSuccess(res, { user: profile });
};

// -----------------------------------------------------------------------------
// GET /api/users/username/:username
// -----------------------------------------------------------------------------

export const getUserByUsername = async (req: Request, res: Response): Promise<void> => {
  const username = req.params.username as string;
  const profile = await usersService.getPublicProfileByUsername(username, req.user?.userId);

  // Check if this is the requester's own profile
  const isOwnProfile = req.user?.userId === profile.id;

  if (isOwnProfile) {
    const privateProfile = await usersService.getPrivateProfile(profile.id);
    sendSuccess(res, { user: privateProfile });
  } else {
    sendSuccess(res, { user: profile });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/users/:id
// -----------------------------------------------------------------------------

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  // Users can only update their own profile
  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only update your own profile' },
    });
    return;
  }

  const profile = await usersService.updateProfile(id, req.body);
  sendSuccess(res, { user: profile });
};

// -----------------------------------------------------------------------------
// PATCH /api/users/:id/privacy
// -----------------------------------------------------------------------------

export const togglePrivacy = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only change your own privacy settings' },
    });
    return;
  }

  const profile = await usersService.togglePrivacy(id, req.body.isPrivate);
  sendSuccess(res, { user: profile });
};

// -----------------------------------------------------------------------------
// GET /api/users/:id/follow-requests
// -----------------------------------------------------------------------------

export const getFollowRequests = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only view your own follow requests' },
    });
    return;
  }

  const requests = await usersService.getFollowRequests(id);
  sendSuccess(res, { followRequests: requests });
};

// -----------------------------------------------------------------------------
// POST /api/users/:id/follow-requests/:requestId/approve
// -----------------------------------------------------------------------------

export const approveFollowRequest = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestId = req.params.requestId as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only manage your own follow requests' },
    });
    return;
  }

  const request = await usersService.approveFollowRequest(id, requestId);
  sendSuccess(res, { followRequest: request });
};

// -----------------------------------------------------------------------------
// POST /api/users/:id/follow-requests/:requestId/deny
// -----------------------------------------------------------------------------

export const denyFollowRequest = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestId = req.params.requestId as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only manage your own follow requests' },
    });
    return;
  }

  const request = await usersService.denyFollowRequest(id, requestId);
  sendSuccess(res, { followRequest: request });
};

// -----------------------------------------------------------------------------
// POST /api/users/:id/follow - Follow user
// -----------------------------------------------------------------------------

export const followUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await usersService.followUser(req.user!.userId, id);
  sendSuccess(res, { following: true });
};

// -----------------------------------------------------------------------------
// DELETE /api/users/:id/follow - Unfollow user
// -----------------------------------------------------------------------------

export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await usersService.unfollowUser(req.user!.userId, id);
  sendSuccess(res, { following: false });
};

// -----------------------------------------------------------------------------
// POST /api/users/:id/become-candidate
// -----------------------------------------------------------------------------

export const becomeCandidate = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only change your own status' },
    });
    return;
  }

  const profile = await usersService.becomeCandidate(id);
  sendSuccess(res, { user: profile });
};

// -----------------------------------------------------------------------------
// POST /api/users/:id/revert-participant
// -----------------------------------------------------------------------------

export const revertToParticipant = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  if (req.user?.userId !== id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only change your own status' },
    });
    return;
  }

  const profile = await usersService.revertToParticipant(id);
  sendSuccess(res, { user: profile });
};

// -----------------------------------------------------------------------------
// DELETE /api/users/:id
// -----------------------------------------------------------------------------

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await usersService.deleteAccount(id, req.user!.userId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// GET /api/users/search
// -----------------------------------------------------------------------------

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  const { q, limit, cursor } = req.query as {
    q: string;
    limit: string;
    cursor?: string;
  };

  const result = await usersService.searchUsers(
    q,
    parseInt(limit) || 20,
    cursor
  );

  sendPaginated(res, result.users, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};
