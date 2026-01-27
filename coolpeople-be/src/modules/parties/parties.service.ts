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
  // Create party + creator membership + group chat in a transaction
  const party = await prisma.$transaction(async (tx) => {
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

    return newParty;
  });

  // Auto-enroll in "Best Party" system race
  const bestPartyRace = await prisma.race.findFirst({
    where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
    select: { id: true },
  });

  if (bestPartyRace) {
    await prisma.$transaction([
      prisma.raceCompetitor.create({
        data: { raceId: bestPartyRace.id, partyId: party.id },
      }),
      prisma.pointLedger.create({
        data: { partyId: party.id, raceId: bestPartyRace.id, totalPoints: 0, tier: 'BRONZE' },
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
  await prisma.partyMembership.create({
    data: {
      userId,
      partyId,
      permissions: DEFAULT_MEMBER_PERMISSIONS,
    },
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

  // Prevent the last admin from leaving
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

  await prisma.partyMembership.delete({ where: { id: membership.id } });
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

  await prisma.$transaction([
    prisma.partyJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    }),
    prisma.partyMembership.create({
      data: {
        userId: request.userId,
        partyId,
        permissions: DEFAULT_MEMBER_PERMISSIONS,
      },
    }),
  ]);

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
