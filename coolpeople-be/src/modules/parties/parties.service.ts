/**
 * Parties Service
 * Business logic for party CRUD, membership, join requests, follow, and group chat
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { ADMIN_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS, POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type {
  PartyResponse,
  MemberResponse,
  JoinRequestResponse,
  ChatMessageResponse,
  CreatePartyRequest,
  UpdatePartyRequest,
  UpdateMemberPermissionsRequest,
  PartyFollowerResponse,
  PartyRaceResponse,
  PartyReviewResponse,
  FullPartyProfileResponse,
} from './parties.types.js';

// =============================================================================
// HELPERS
// =============================================================================

const formatParty = (party: any, viewerId?: string): PartyResponse => {
  const membership = viewerId
    ? party.memberships?.find((m: any) => m.userId === viewerId)
    : undefined;

  return {
    id: party.id,
    name: party.name,
    handle: party.handle,
    description: party.description,
    avatarUrl: party.avatarUrl,
    bannerUrl: party.bannerUrl,
    isPrivate: party.isPrivate,
    chatMode: party.chatMode,
    memberCount: party._count?.memberships ?? 0,
    followerCount: party._count?.followers ?? 0,
    isFollowing: viewerId
      ? party.followers?.some((f: any) => f.userId === viewerId)
      : undefined,
    isMember: viewerId ? !!membership : undefined,
    myPermissions: membership?.permissions,
    createdAt: party.createdAt,
  };
};

const partyIncludes = (viewerId?: string) => ({
  _count: {
    select: { memberships: true, followers: true },
  },
  ...(viewerId && {
    followers: { where: { userId: viewerId }, take: 1 },
    memberships: { where: { userId: viewerId }, take: 1 },
  }),
});

const getPartyOrThrow = async (partyId: string) => {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.deletedAt) {
    throw new NotFoundError('Party');
  }
  return party;
};

const getMembershipOrThrow = async (userId: string, partyId: string) => {
  const membership = await prisma.partyMembership.findUnique({
    where: { userId_partyId: { userId, partyId } },
  });
  if (!membership) {
    throw new NotFoundError('Membership');
  }
  return membership;
};

/**
 * Helper: Handle leaving user's current party when they join/create a new one.
 * If user was the last member, the old party is soft-deleted and removed from races.
 * Must be called within a transaction context (tx).
 */
const handleLeavePreviousParty = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
): Promise<void> => {
  // Check if user is currently in a party
  const currentMembership = await tx.partyMembership.findFirst({
    where: { userId },
  });

  if (!currentMembership) return;

  const oldPartyId = currentMembership.partyId;

  // Check member count of old party
  const memberCount = await tx.partyMembership.count({
    where: { partyId: oldPartyId },
  });

  // Remove user's membership from old party
  await tx.partyMembership.delete({
    where: { id: currentMembership.id },
  });

  // If this was the last member, soft-delete the old party
  if (memberCount <= 1) {
    // Clear partyId from any users who have this as their primary party
    await tx.user.updateMany({
      where: { partyId: oldPartyId },
      data: { partyId: null },
    });

    // Delete related data
    await tx.partyFollow.deleteMany({ where: { partyId: oldPartyId } });
    await tx.partyJoinRequest.deleteMany({ where: { partyId: oldPartyId } });
    await tx.groupChat.deleteMany({ where: { partyId: oldPartyId } });

    // Remove from race competitions and point ledgers
    await tx.pointLedger.deleteMany({ where: { partyId: oldPartyId } });
    await tx.raceCompetitor.deleteMany({ where: { partyId: oldPartyId } });

    // Soft delete the party
    await tx.party.update({
      where: { id: oldPartyId },
      data: { deletedAt: new Date() },
    });
  }
};

// =============================================================================
// PARTY NAME/HANDLE AVAILABILITY CHECK
// =============================================================================

/**
 * Check if a party name or handle is already taken
 * Returns { available: boolean, takenBy: 'name' | 'handle' | null }
 */
export const checkPartyNameAvailability = async (
  name?: string,
  handle?: string
): Promise<{ available: boolean; takenBy: 'name' | 'handle' | null }> => {
  // Check handle first (more specific)
  if (handle) {
    const existingByHandle = await prisma.party.findFirst({
      where: {
        handle: handle.toLowerCase(),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingByHandle) {
      return { available: false, takenBy: 'handle' };
    }
  }

  // Check name (case-insensitive)
  if (name) {
    const existingByName = await prisma.party.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingByName) {
      return { available: false, takenBy: 'name' };
    }
  }

  return { available: true, takenBy: null };
};

// =============================================================================
// ORPHANED PARTY DATA CLEANUP
// =============================================================================

/**
 * Clean up orphaned party data:
 * 1. Find parties with 0 members that aren't soft-deleted yet
 * 2. Soft delete them and clean up related data (except posts)
 * 3. Return count of cleaned up parties
 */
export const cleanupOrphanedParties = async (): Promise<{
  cleanedCount: number;
  orphanedPartyIds: string[];
}> => {
  // Find parties that have no members but aren't soft-deleted
  const orphanedParties = await prisma.party.findMany({
    where: {
      deletedAt: null,
      memberships: {
        none: {},
      },
    },
    select: { id: true, name: true },
  });

  const orphanedPartyIds = orphanedParties.map((p) => p.id);

  if (orphanedPartyIds.length === 0) {
    return { cleanedCount: 0, orphanedPartyIds: [] };
  }

  // Clean up each orphaned party
  await prisma.$transaction(async (tx) => {
    for (const partyId of orphanedPartyIds) {
      // Clear partyId from any users who have this as their primary party
      await tx.user.updateMany({
        where: { partyId },
        data: { partyId: null },
      });

      // Delete related data (NOT posts - they live on user profiles too)
      await tx.partyFollow.deleteMany({ where: { partyId } });
      await tx.partyJoinRequest.deleteMany({ where: { partyId } });
      await tx.groupChat.deleteMany({ where: { partyId } });
      await tx.pointLedger.deleteMany({ where: { partyId } });
      await tx.raceCompetitor.deleteMany({ where: { partyId } });
      await tx.icebreaker.deleteMany({ where: { partyId } });

      // Note: Posts (Reels) are NOT deleted - they remain associated with the user
      // The partyId on Reel is just for categorization, not ownership

      // Soft delete the party
      await tx.party.update({
        where: { id: partyId },
        data: { deletedAt: new Date() },
      });
    }
  });

  return {
    cleanedCount: orphanedPartyIds.length,
    orphanedPartyIds,
  };
};

// =============================================================================
// PARTY CRUD
// =============================================================================

// -----------------------------------------------------------------------------
// Create Party
// -----------------------------------------------------------------------------

export const createParty = async (
  data: CreatePartyRequest,
  creatorId: string
): Promise<PartyResponse> => {
  // Create party + creator membership + group chat + update user affiliation in a transaction
  const party = await prisma.$transaction(async (tx) => {
    // Handle leaving previous party (deletes it if user was last member)
    await handleLeavePreviousParty(tx, creatorId);

    const newParty = await tx.party.create({
      data: {
        name: data.name,
        handle: data.handle.toLowerCase(),
        description: data.description,
        avatarUrl: data.avatarUrl,
        bannerUrl: data.bannerUrl,
        isPrivate: data.isPrivate ?? false,
        chatMode: (data.chatMode as any) ?? 'OPEN',
      },
    });

    // Creator gets all permissions (admin)
    await tx.partyMembership.create({
      data: {
        userId: creatorId,
        partyId: newParty.id,
        permissions: ADMIN_PERMISSIONS,
      },
    });

    // Create group chat for the party
    await tx.groupChat.create({
      data: { partyId: newParty.id },
    });

    // Update creator's primary party affiliation (displayed sitewide on their profile)
    // This changes their affiliation from Independent/previous party to this new party
    await tx.user.update({
      where: { id: creatorId },
      data: { partyId: newParty.id },
    });

    return newParty;
  });

  // Auto-enroll in "Best Party" system race with starting bonus
  const bestPartyRace = await prisma.race.findFirst({
    where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
    select: { id: true },
  });

  if (bestPartyRace) {
    // Give new parties a small starting bonus (10-50 points) to encourage engagement
    const startingBonus = Math.floor(Math.random() * 41) + 10; // Random 10-50

    await prisma.$transaction([
      prisma.raceCompetitor.create({
        data: { raceId: bestPartyRace.id, partyId: party.id },
      }),
      prisma.pointLedger.create({
        data: { partyId: party.id, raceId: bestPartyRace.id, totalPoints: startingBonus, tier: 'BRONZE' },
      }),
    ]).catch(() => {}); // Don't fail party creation on race enrollment errors
  }

  // Fetch with includes for response
  const fullParty = await prisma.party.findUnique({
    where: { id: party.id },
    include: partyIncludes(creatorId),
  });

  return formatParty(fullParty, creatorId);
};

// -----------------------------------------------------------------------------
// Get Party
// -----------------------------------------------------------------------------

export const getParty = async (
  partyId: string,
  viewerId?: string
): Promise<PartyResponse> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: partyIncludes(viewerId),
  });

  if (!party || party.deletedAt) {
    throw new NotFoundError('Party');
  }

  return formatParty(party, viewerId);
};

// -----------------------------------------------------------------------------
// Get Party by Handle or Name
// Searches by handle first, then by name (case-insensitive)
// -----------------------------------------------------------------------------

export const getPartyByHandle = async (
  handleOrName: string,
  viewerId?: string
): Promise<PartyResponse> => {
  // First try exact handle match
  let party = await prisma.party.findFirst({
    where: {
      handle: handleOrName.toLowerCase(),
      deletedAt: null,
    },
    include: partyIncludes(viewerId),
  });

  // If not found, try name match (case-insensitive)
  if (!party) {
    party = await prisma.party.findFirst({
      where: {
        name: { equals: handleOrName, mode: 'insensitive' },
        deletedAt: null,
      },
      include: partyIncludes(viewerId),
    });
  }

  // If still not found, try partial name match
  if (!party) {
    party = await prisma.party.findFirst({
      where: {
        name: { contains: handleOrName, mode: 'insensitive' },
        deletedAt: null,
      },
      include: partyIncludes(viewerId),
    });
  }

  if (!party) {
    throw new NotFoundError('Party');
  }

  return formatParty(party, viewerId);
};

// -----------------------------------------------------------------------------
// List Parties
// -----------------------------------------------------------------------------

export const listParties = async (
  filters: { search?: string },
  cursor?: string,
  limit: number = 20,
  viewerId?: string
): Promise<{ parties: PartyResponse[]; nextCursor: string | null }> => {
  const where: any = { deletedAt: null };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { handle: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const parties = await prisma.party.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: partyIncludes(viewerId),
  });

  const hasMore = parties.length > limit;
  const results = hasMore ? parties.slice(0, -1) : parties;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    parties: results.map((p) => formatParty(p, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Update Party (admin only - enforced by middleware)
// -----------------------------------------------------------------------------

export const updateParty = async (
  partyId: string,
  data: UpdatePartyRequest
): Promise<PartyResponse> => {
  await getPartyOrThrow(partyId);

  const party = await prisma.party.update({
    where: { id: partyId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.handle !== undefined && { handle: data.handle.toLowerCase() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
      ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
      ...(data.chatMode !== undefined && { chatMode: data.chatMode as any }),
    },
    include: partyIncludes(),
  });

  return formatParty(party);
};

// -----------------------------------------------------------------------------
// Delete Party (soft delete - admin only)
// Only ADMIN can delete. Soft-delete party, keep content, remove from races.
// -----------------------------------------------------------------------------

export const deleteParty = async (partyId: string): Promise<void> => {
  await getPartyOrThrow(partyId);

  await prisma.$transaction(async (tx) => {
    // Soft delete the party
    await tx.party.update({
      where: { id: partyId },
      data: { deletedAt: new Date() },
    });

    // Remove from race competitions
    await tx.raceCompetitor.deleteMany({
      where: { partyId },
    });

    // Remove point ledgers for this party
    // (events are orphaned but that's acceptable for audit trail)
    await tx.pointLedger.deleteMany({
      where: { partyId },
    });
  });
};

// =============================================================================
// FOLLOW / UNFOLLOW
// =============================================================================

export const followParty = async (
  userId: string,
  partyId: string
): Promise<void> => {
  const party = await getPartyOrThrow(partyId);

  try {
    await prisma.partyFollow.create({ data: { userId, partyId } });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already following this party');
    throw err;
  }

  // Award follow points to party in Best Party race
  const bestPartyRace = await prisma.race.findFirst({
    where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
    select: { id: true },
  });

  if (bestPartyRace) {
    recordPointEvent({
      targetPartyId: partyId,
      raceId: bestPartyRace.id,
      action: 'FOLLOW',
      points: POINT_WEIGHTS.FOLLOW,
      sourceUserId: userId,
    }).catch(() => {});
  }
};

export const unfollowParty = async (
  userId: string,
  partyId: string
): Promise<void> => {
  const existing = await prisma.partyFollow.findUnique({
    where: { userId_partyId: { userId, partyId } },
  });
  if (!existing) throw new NotFoundError('Party follow');

  await prisma.partyFollow.delete({ where: { id: existing.id } });

  // Deduct unfollow points
  const bestPartyRace = await prisma.race.findFirst({
    where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
    select: { id: true },
  });

  if (bestPartyRace) {
    recordPointEvent({
      targetPartyId: partyId,
      raceId: bestPartyRace.id,
      action: 'UNFOLLOW',
      points: POINT_WEIGHTS.UNFOLLOW,
      sourceUserId: userId,
    }).catch(() => {});
  }
};

// =============================================================================
// MEMBERSHIP
// =============================================================================

// -----------------------------------------------------------------------------
// Join Party
// For public parties: immediately joins with default permissions
// For private parties: creates a join request
// -----------------------------------------------------------------------------

export const joinParty = async (
  userId: string,
  partyId: string
): Promise<{ joined: boolean; requested: boolean }> => {
  const party = await getPartyOrThrow(partyId);

  // Check not already a member
  const existingMembership = await prisma.partyMembership.findUnique({
    where: { userId_partyId: { userId, partyId } },
  });
  if (existingMembership) {
    throw new ConflictError('Already a member of this party');
  }

  if (party.isPrivate) {
    // Check for existing pending request
    const existingRequest = await prisma.partyJoinRequest.findUnique({
      where: { userId_partyId: { userId, partyId } },
    });
    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new ConflictError('Join request already pending');
      }
      // Allow re-requesting if previously denied
      await prisma.partyJoinRequest.update({
        where: { id: existingRequest.id },
        data: { status: 'PENDING' },
      });
    } else {
      await prisma.partyJoinRequest.create({
        data: { userId, partyId },
      });
    }
    return { joined: false, requested: true };
  }

  // Public party: join immediately
  await prisma.$transaction(async (tx) => {
    // Handle leaving previous party (deletes it if user was last member)
    await handleLeavePreviousParty(tx, userId);

    await tx.partyMembership.create({
      data: {
        userId,
        partyId,
        permissions: DEFAULT_MEMBER_PERMISSIONS,
      },
    });

    // Update user's primary party affiliation (displayed sitewide on their profile)
    await tx.user.update({
      where: { id: userId },
      data: { partyId },
    });
  });

  return { joined: true, requested: false };
};

// -----------------------------------------------------------------------------
// Leave Party
// -----------------------------------------------------------------------------

export const leaveParty = async (
  userId: string,
  partyId: string
): Promise<void> => {
  const membership = await getMembershipOrThrow(userId, partyId);

  // Check total member count
  const memberCount = await prisma.partyMembership.count({
    where: { partyId },
  });

  // If this is the last member, delete the party entirely
  if (memberCount <= 1) {
    await prisma.$transaction(async (tx) => {
      // Clear partyId from any users who have this as their primary party
      await tx.user.updateMany({
        where: { partyId },
        data: { partyId: null },
      });

      // Delete related data
      await tx.partyMembership.deleteMany({ where: { partyId } });
      await tx.partyFollow.deleteMany({ where: { partyId } });
      await tx.partyJoinRequest.deleteMany({ where: { partyId } });
      await tx.groupChat.deleteMany({ where: { partyId } });

      // Remove from race competitions and point ledgers
      await tx.pointLedger.deleteMany({ where: { partyId } });
      await tx.raceCompetitor.deleteMany({ where: { partyId } });

      // Soft delete the party
      await tx.party.update({
        where: { id: partyId },
        data: { deletedAt: new Date() },
      });
    });
    return;
  }

  // Prevent the last admin from leaving (if there are other members)
  if (membership.permissions.includes('admin')) {
    const adminCount = await prisma.partyMembership.count({
      where: {
        partyId,
        permissions: { has: 'admin' },
      },
    });
    if (adminCount <= 1) {
      throw new ForbiddenError('Cannot leave party as the last admin. Transfer admin first or delete the party.');
    }
  }

  // Clear user's primary party affiliation if leaving their primary party
  await prisma.$transaction([
    prisma.partyMembership.delete({ where: { id: membership.id } }),
    prisma.user.update({
      where: { id: userId, partyId },
      data: { partyId: null },
    }),
  ]);
};

// -----------------------------------------------------------------------------
// List Members
// -----------------------------------------------------------------------------

export const listMembers = async (
  partyId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ members: MemberResponse[]; nextCursor: string | null }> => {
  await getPartyOrThrow(partyId);

  const memberships = await prisma.partyMembership.findMany({
    where: { partyId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { joinedAt: 'asc' },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const hasMore = memberships.length > limit;
  const results = hasMore ? memberships.slice(0, -1) : memberships;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    members: results.map((m) => ({
      id: m.id,
      userId: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      permissions: m.permissions,
      joinedAt: m.joinedAt,
    })),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Update Member Permissions (admin only - enforced by middleware)
// -----------------------------------------------------------------------------

export const updateMemberPermissions = async (
  partyId: string,
  targetUserId: string,
  actorId: string,
  data: UpdateMemberPermissionsRequest
): Promise<MemberResponse> => {
  await getPartyOrThrow(partyId);
  const targetMembership = await getMembershipOrThrow(targetUserId, partyId);

  // Cannot modify own permissions
  if (targetUserId === actorId) {
    throw new ForbiddenError('Cannot modify your own permissions');
  }

  // Cannot remove admin from another admin (only they can demote themselves or transfer)
  const actorMembership = await getMembershipOrThrow(actorId, partyId);
  if (
    targetMembership.permissions.includes('admin') &&
    !actorMembership.permissions.includes('admin')
  ) {
    throw new ForbiddenError('Cannot modify admin permissions');
  }

  const updated = await prisma.partyMembership.update({
    where: { id: targetMembership.id },
    data: { permissions: data.permissions },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return {
    id: updated.id,
    userId: updated.user.id,
    username: updated.user.username,
    displayName: updated.user.displayName,
    avatarUrl: updated.user.avatarUrl,
    permissions: updated.permissions,
    joinedAt: updated.joinedAt,
  };
};

// -----------------------------------------------------------------------------
// Remove Member (admin/moderate - enforced by middleware)
// -----------------------------------------------------------------------------

export const removeMember = async (
  partyId: string,
  targetUserId: string,
  actorId: string
): Promise<void> => {
  await getPartyOrThrow(partyId);
  const targetMembership = await getMembershipOrThrow(targetUserId, partyId);

  // Cannot remove yourself (use leave instead)
  if (targetUserId === actorId) {
    throw new ForbiddenError('Cannot remove yourself. Use leave instead.');
  }

  // Cannot remove another admin unless you are also admin
  if (targetMembership.permissions.includes('admin')) {
    const actorMembership = await getMembershipOrThrow(actorId, partyId);
    if (!actorMembership.permissions.includes('admin')) {
      throw new ForbiddenError('Only admins can remove other admins');
    }
  }

  await prisma.partyMembership.delete({ where: { id: targetMembership.id } });
};

// =============================================================================
// JOIN REQUESTS (Private Parties)
// =============================================================================

// -----------------------------------------------------------------------------
// List Pending Join Requests
// -----------------------------------------------------------------------------

export const listJoinRequests = async (
  partyId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ requests: JoinRequestResponse[]; nextCursor: string | null }> => {
  await getPartyOrThrow(partyId);

  const requests = await prisma.partyJoinRequest.findMany({
    where: { partyId, status: 'PENDING' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const hasMore = requests.length > limit;
  const results = hasMore ? requests.slice(0, -1) : requests;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    requests: results.map((r) => ({
      id: r.id,
      user: r.user,
      status: r.status,
      createdAt: r.createdAt,
    })),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Approve Join Request
// -----------------------------------------------------------------------------

export const approveJoinRequest = async (
  partyId: string,
  requestId: string
): Promise<void> => {
  await getPartyOrThrow(partyId);

  const request = await prisma.partyJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.partyId !== partyId) {
    throw new NotFoundError('Join request');
  }
  if (request.status !== 'PENDING') {
    throw new ConflictError('Join request already processed');
  }

  await prisma.$transaction(async (tx) => {
    // Handle leaving previous party (deletes it if user was last member)
    await handleLeavePreviousParty(tx, request.userId);

    await tx.partyJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    await tx.partyMembership.create({
      data: {
        userId: request.userId,
        partyId,
        permissions: DEFAULT_MEMBER_PERMISSIONS,
      },
    });

    // Update user's primary party affiliation (displayed sitewide on their profile)
    await tx.user.update({
      where: { id: request.userId },
      data: { partyId },
    });
  });

  // Notify the user that their request was approved
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { name: true },
  });
  createNotification({
    userId: request.userId,
    type: 'PARTY_INVITE',
    title: 'Join request approved',
    body: `Your request to join ${party?.name ?? 'a party'} was approved`,
    data: { partyId },
  }).catch(() => {});
};

// -----------------------------------------------------------------------------
// Deny Join Request
// -----------------------------------------------------------------------------

export const denyJoinRequest = async (
  partyId: string,
  requestId: string
): Promise<void> => {
  await getPartyOrThrow(partyId);

  const request = await prisma.partyJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.partyId !== partyId) {
    throw new NotFoundError('Join request');
  }
  if (request.status !== 'PENDING') {
    throw new ConflictError('Join request already processed');
  }

  await prisma.partyJoinRequest.update({
    where: { id: requestId },
    data: { status: 'DENIED' },
  });
};

// =============================================================================
// GROUP CHAT
// =============================================================================

// -----------------------------------------------------------------------------
// Get Chat Messages
// -----------------------------------------------------------------------------

export const getChatMessages = async (
  partyId: string,
  viewerId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ messages: ChatMessageResponse[]; nextCursor: string | null }> => {
  await getPartyOrThrow(partyId);

  const groupChat = await prisma.groupChat.findUnique({
    where: { partyId },
  });
  if (!groupChat) {
    throw new NotFoundError('Group chat');
  }

  const messages = await prisma.chatMessage.findMany({
    where: { groupChatId: groupChat.id },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      reactions: true,
    },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    messages: results.map((m) => formatChatMessage(m, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Send Chat Message
// Chat mode enforcement:
// - OPEN: check CHAT permission
// - ADMIN_ONLY: check ADMIN or MODERATE permission
// - CYCLE: deferred to future (treat as OPEN for now)
// -----------------------------------------------------------------------------

export const sendChatMessage = async (
  partyId: string,
  userId: string,
  content: string
): Promise<ChatMessageResponse> => {
  const party = await getPartyOrThrow(partyId);
  const membership = await getMembershipOrThrow(userId, partyId);

  // Chat mode enforcement
  const hasAdmin = membership.permissions.includes('admin');
  const hasModerate = membership.permissions.includes('moderate');
  const hasChat = membership.permissions.includes('chat');

  if (party.chatMode === 'ADMIN_ONLY') {
    if (!hasAdmin && !hasModerate) {
      throw new ForbiddenError('Only admins and moderators can send messages in this chat');
    }
  } else {
    // OPEN or CYCLE (treat CYCLE as OPEN for MVP)
    if (!hasChat && !hasAdmin && !hasModerate) {
      throw new ForbiddenError('You do not have chat permission');
    }
  }

  const groupChat = await prisma.groupChat.findUnique({
    where: { partyId },
  });
  if (!groupChat) {
    throw new NotFoundError('Group chat');
  }

  const message = await prisma.chatMessage.create({
    data: {
      groupChatId: groupChat.id,
      userId,
      content,
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      reactions: true,
    },
  });

  // Emit real-time chat message via WebSocket
  try {
    const io = getIO();
    if (io) {
      io.to(`party:${partyId}`).emit('chat:message', {
        partyId,
        message: {
          id: message.id,
          userId,
          content: message.content,
          createdAt: message.createdAt,
          user: message.user,
        },
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }

  return formatChatMessage(message, userId);
};

// -----------------------------------------------------------------------------
// Delete Chat Message
// User can delete own messages; admin/moderate can delete any
// -----------------------------------------------------------------------------

export const deleteChatMessage = async (
  partyId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  await getPartyOrThrow(partyId);

  const groupChat = await prisma.groupChat.findUnique({
    where: { partyId },
  });
  if (!groupChat) throw new NotFoundError('Group chat');

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });
  if (!message || message.groupChatId !== groupChat.id) {
    throw new NotFoundError('Message');
  }

  // Check permission: own message or admin/moderate
  if (message.userId !== userId) {
    const membership = await getMembershipOrThrow(userId, partyId);
    if (
      !membership.permissions.includes('admin') &&
      !membership.permissions.includes('moderate')
    ) {
      throw new ForbiddenError('You can only delete your own messages');
    }
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });
};

// -----------------------------------------------------------------------------
// Add Reaction
// -----------------------------------------------------------------------------

export const addReaction = async (
  partyId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  await getPartyOrThrow(partyId);
  await getMembershipOrThrow(userId, partyId);

  const groupChat = await prisma.groupChat.findUnique({
    where: { partyId },
  });
  if (!groupChat) throw new NotFoundError('Group chat');

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });
  if (!message || message.groupChatId !== groupChat.id) {
    throw new NotFoundError('Message');
  }

  try {
    await prisma.chatReaction.create({
      data: { messageId, userId, emoji },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already reacted with this emoji');
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Remove Reaction
// -----------------------------------------------------------------------------

export const removeReaction = async (
  partyId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  await getPartyOrThrow(partyId);

  const groupChat = await prisma.groupChat.findUnique({
    where: { partyId },
  });
  if (!groupChat) throw new NotFoundError('Group chat');

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });
  if (!message || message.groupChatId !== groupChat.id) {
    throw new NotFoundError('Message');
  }

  const reaction = await prisma.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });
  if (!reaction) throw new NotFoundError('Reaction');

  await prisma.chatReaction.delete({ where: { id: reaction.id } });
};

// =============================================================================
// FOLLOWERS
// =============================================================================

// -----------------------------------------------------------------------------
// List Party Followers
// -----------------------------------------------------------------------------

export const listFollowers = async (
  partyId: string,
  cursor?: string,
  limit: number = 20,
  viewerId?: string
): Promise<{ followers: PartyFollowerResponse[]; nextCursor: string | null }> => {
  await getPartyOrThrow(partyId);

  const follows = await prisma.partyFollow.findMany({
    where: { partyId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          party: { select: { name: true } },
          followers: viewerId ? { where: { followerId: viewerId }, take: 1 } : false,
        },
      },
    },
  });

  const hasMore = follows.length > limit;
  const results = hasMore ? follows.slice(0, -1) : follows;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    followers: results.map((f) => ({
      id: f.id,
      userId: f.user.id,
      username: f.user.username,
      displayName: f.user.displayName,
      avatarUrl: f.user.avatarUrl,
      partyName: f.user.party?.name || null,
      isFollowing: viewerId ? (f.user.followers as any[])?.length > 0 : undefined,
      createdAt: f.createdAt,
    })),
    nextCursor,
  };
};

// =============================================================================
// PARTY RACES
// =============================================================================

// -----------------------------------------------------------------------------
// List Party Races (races the party is competing in with points data)
// -----------------------------------------------------------------------------

export const listPartyRaces = async (
  partyId: string
): Promise<PartyRaceResponse[]> => {
  await getPartyOrThrow(partyId);

  // Get all race competitions for this party
  const competitions = await prisma.raceCompetitor.findMany({
    where: { partyId },
    include: {
      race: {
        select: {
          id: true,
          title: true,
          raceType: true,
          isSystemRace: true,
        },
      },
    },
  });

  // Get point ledgers for each race
  const raceResults: PartyRaceResponse[] = [];

  for (const comp of competitions) {
    const ledger = await prisma.pointLedger.findUnique({
      where: { partyId_raceId: { partyId, raceId: comp.raceId } },
    });

    // Calculate position in this race
    const position = ledger
      ? await prisma.pointLedger.count({
          where: {
            raceId: comp.raceId,
            partyId: { not: null },
            totalPoints: { gt: ledger.totalPoints },
          },
        }) + 1
      : null;

    // Calculate change from last week (simplified - get events from last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentEvents = ledger
      ? await prisma.pointEvent.aggregate({
          where: {
            ledgerId: ledger.id,
            createdAt: { gte: weekAgo },
          },
          _sum: { points: true },
        })
      : { _sum: { points: 0 } };

    const change = recentEvents._sum.points || 0;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);

    raceResults.push({
      id: comp.id,
      raceId: comp.raceId,
      raceName: comp.race.title,
      raceType: comp.race.raceType,
      position,
      totalPoints: ledger?.totalPoints || 0,
      tier: ledger?.tier || 'BRONZE',
      change: changeStr,
      isSystemRace: comp.race.isSystemRace,
    });
  }

  return raceResults;
};

// =============================================================================
// PARTY REVIEWS
// =============================================================================

// -----------------------------------------------------------------------------
// List Party Reviews
// -----------------------------------------------------------------------------

export const listPartyReviews = async (
  partyId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reviews: PartyReviewResponse[]; nextCursor: string | null; averageRating: number | null }> => {
  await getPartyOrThrow(partyId);

  const reviews = await prisma.review.findMany({
    where: { targetPartyId: partyId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          party: { select: { name: true } },
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Calculate average rating
  const ratingAgg = await prisma.review.aggregate({
    where: { targetPartyId: partyId },
    _avg: { rating: true },
    _count: { id: true },
  });

  const hasMore = reviews.length > limit;
  const results = hasMore ? reviews.slice(0, -1) : reviews;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    reviews: results.map((r) => ({
      id: r.id,
      author: {
        id: r.author.id,
        username: r.author.username,
        displayName: r.author.displayName,
        avatarUrl: r.author.avatarUrl,
        partyName: r.author.party?.name || null,
      },
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      replies: r.replies.map((rep) => ({
        id: rep.id,
        userId: rep.user.id,
        username: rep.user.username,
        displayName: rep.user.displayName,
        avatarUrl: rep.user.avatarUrl,
        content: rep.content,
        createdAt: rep.createdAt,
      })),
    })),
    nextCursor,
    averageRating: ratingAgg._avg.rating,
  };
};

// =============================================================================
// FULL PARTY PROFILE
// =============================================================================

// -----------------------------------------------------------------------------
// Get Full Party Profile (comprehensive data for profile page)
// -----------------------------------------------------------------------------

export const getFullPartyProfile = async (
  partyId: string,
  viewerId?: string
): Promise<FullPartyProfileResponse> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      ...partyIncludes(viewerId),
      reviewsReceived: {
        select: { rating: true },
      },
    },
  });

  if (!party || party.deletedAt) {
    throw new NotFoundError('Party');
  }

  // Get Best Party race points (system race)
  const bestPartyRace = await prisma.race.findFirst({
    where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
    select: { id: true },
  });

  let cpPoints = 0;
  let tier = 'BRONZE';
  let change = '+0.00';

  if (bestPartyRace) {
    const ledger = await prisma.pointLedger.findUnique({
      where: { partyId_raceId: { partyId, raceId: bestPartyRace.id } },
    });

    if (ledger) {
      cpPoints = ledger.totalPoints;
      tier = ledger.tier;

      // Calculate weekly change
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentEvents = await prisma.pointEvent.aggregate({
        where: {
          ledgerId: ledger.id,
          createdAt: { gte: weekAgo },
        },
        _sum: { points: true },
      });

      const changeVal = recentEvents._sum.points || 0;
      change = changeVal >= 0 ? `+${changeVal.toFixed(2)}` : changeVal.toFixed(2);
    }
  }

  // Count races
  const raceCount = await prisma.raceCompetitor.count({
    where: { partyId },
  });

  // Calculate average rating
  const totalRating = party.reviewsReceived.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = party.reviewsReceived.length > 0
    ? totalRating / party.reviewsReceived.length
    : null;

  const baseParty = formatParty(party, viewerId);

  return {
    ...baseParty,
    stats: {
      cpPoints,
      tier,
      change,
      raceCount,
    },
    averageRating,
    reviewCount: party.reviewsReceived.length,
  };
};

// =============================================================================
// CHAT HELPERS
// =============================================================================

const formatChatMessage = (message: any, viewerId: string): ChatMessageResponse => {
  // Aggregate reactions: group by emoji, count, and check if viewer reacted
  const reactionMap = new Map<string, { count: number; reacted: boolean }>();
  for (const r of message.reactions ?? []) {
    const existing = reactionMap.get(r.emoji) ?? { count: 0, reacted: false };
    existing.count++;
    if (r.userId === viewerId) existing.reacted = true;
    reactionMap.set(r.emoji, existing);
  }

  return {
    id: message.id,
    content: message.content,
    user: message.user,
    reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reacted: data.reacted,
    })),
    createdAt: message.createdAt,
  };
};
