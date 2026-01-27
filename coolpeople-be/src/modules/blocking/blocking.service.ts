/**
 * Blocking Service
 * Business logic for user blocking
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import type { BlockResponse, BlockedUserResponse } from './blocking.types.js';

// -----------------------------------------------------------------------------
// Block User
// Creates a block, removes follows in both directions, and removes pending
// follow requests between the two users — all within a transaction.
// -----------------------------------------------------------------------------

export const blockUser = async (
  blockerId: string,
  blockedId: string
): Promise<BlockResponse> => {
  if (blockerId === blockedId) {
    throw new ForbiddenError('You cannot block yourself');
  }

  // Check that the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new NotFoundError('User');
  }

  // Check for existing block
  const existingBlock = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });

  if (existingBlock) {
    throw new ConflictError('User is already blocked');
  }

  // Atomically: create block, remove follows (both directions), remove follow requests
  const [block] = await prisma.$transaction([
    // 1. Create the block
    prisma.block.create({
      data: { blockerId, blockedId },
    }),

    // 2. Remove follow: blocker -> blocked
    prisma.follow.deleteMany({
      where: { followerId: blockerId, followingId: blockedId },
    }),

    // 3. Remove follow: blocked -> blocker
    prisma.follow.deleteMany({
      where: { followerId: blockedId, followingId: blockerId },
    }),

    // 4. Remove follow requests: blocker -> blocked
    prisma.followRequest.deleteMany({
      where: { fromUserId: blockerId, toUserId: blockedId },
    }),

    // 5. Remove follow requests: blocked -> blocker
    prisma.followRequest.deleteMany({
      where: { fromUserId: blockedId, toUserId: blockerId },
    }),
  ]);

  return {
    id: block.id,
    blockerId: block.blockerId,
    blockedId: block.blockedId,
    createdAt: block.createdAt,
  };
};

// -----------------------------------------------------------------------------
// Unblock User
// -----------------------------------------------------------------------------

export const unblockUser = async (
  blockerId: string,
  blockedId: string
): Promise<void> => {
  const existingBlock = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });

  if (!existingBlock) {
    throw new NotFoundError('Block');
  }

  await prisma.block.delete({
    where: { id: existingBlock.id },
  });
};

// -----------------------------------------------------------------------------
// Get Blocked Users List (cursor-based pagination)
// Returns blocked users with basic profile info
// -----------------------------------------------------------------------------

export const getBlockedUsers = async (
  userId: string,
  limit: number,
  cursor?: string
): Promise<{ blockedUsers: BlockedUserResponse[]; nextCursor: string | null }> => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      blocked: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = blocks.length > limit;
  const results = hasMore ? blocks.slice(0, -1) : blocks;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  const blockedUsers: BlockedUserResponse[] = results.map((block) => ({
    id: block.id,
    blockedId: block.blockedId,
    createdAt: block.createdAt,
    blocked: block.blocked,
  }));

  return { blockedUsers, nextCursor };
};

// -----------------------------------------------------------------------------
// Utility: Get all user IDs blocked in either direction
// Returns IDs where userId blocked them OR they blocked userId.
// Used by other modules to filter blocked users from feeds, search, DMs, etc.
// -----------------------------------------------------------------------------

export const getBlockedUserIds = async (userId: string): Promise<string[]> => {
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: userId },
        { blockedId: userId },
      ],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  const blockedIds = new Set<string>();

  for (const block of blocks) {
    if (block.blockerId === userId) {
      blockedIds.add(block.blockedId);
    } else {
      blockedIds.add(block.blockerId);
    }
  }

  return Array.from(blockedIds);
};

// -----------------------------------------------------------------------------
// Utility: Check if a block exists between two users (either direction)
// -----------------------------------------------------------------------------

export const isBlocked = async (
  userId1: string,
  userId2: string
): Promise<boolean> => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
    select: { id: true },
  });

  return !!block;
};
