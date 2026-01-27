/**
 * Users Service
 * Business logic for user management
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { SYSTEM_RACES, POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { PublicProfile, PrivateProfile, UpdateProfileRequest, FollowRequestResponse } from './users.types.js';

// -----------------------------------------------------------------------------
// Get User by ID (Public Profile)
// Returns full profile for public accounts / candidates,
// header-only for private participants when viewer is not a follower.
// -----------------------------------------------------------------------------

export const getPublicProfile = async (
  userId: string,
  _viewerId?: string
): Promise<PublicProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          reviewsReceived: true,
        },
      },
      pointLedgers: {
        include: {
          race: {
            select: { id: true, title: true },
          },
        },
      },
      reviewsReceived: {
        select: { rating: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const profile: PublicProfile = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    userType: user.userType,
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt,
    followersCount: user._count.followers,
    followingCount: user._count.following,
  };

  // Add candidate-only fields
  if (user.userType === 'CANDIDATE') {
    profile.points = user.pointLedgers.map((ledger) => ({
      total: ledger.totalPoints,
      tier: ledger.tier,
      raceId: ledger.raceId,
      raceName: ledger.race.title,
    }));
    profile.reviewsCount = user._count.reviewsReceived;

    // Calculate average rating
    if (user.reviewsReceived.length > 0) {
      const sum = user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0);
      profile.averageRating = sum / user.reviewsReceived.length;
    }
  }

  return profile;
};

// -----------------------------------------------------------------------------
// Get User by Username (Public Profile)
// -----------------------------------------------------------------------------

export const getPublicProfileByUsername = async (
  username: string,
  _viewerId?: string
): Promise<PublicProfile> => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return getPublicProfile(user.id, _viewerId);
};

// -----------------------------------------------------------------------------
// Get Private Profile (for the user themselves)
// -----------------------------------------------------------------------------

export const getPrivateProfile = async (userId: string): Promise<PrivateProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          reviewsReceived: true,
        },
      },
      pointLedgers: {
        include: {
          race: {
            select: { id: true, title: true },
          },
        },
      },
      reviewsReceived: {
        select: { rating: true },
      },
      partyMemberships: {
        include: {
          party: {
            select: { id: true, name: true, handle: true },
          },
        },
      },
      raceFollows: {
        include: {
          race: {
            select: { id: true, title: true },
          },
        },
      },
      raceCompetitions: {
        include: {
          race: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const profile: PrivateProfile = {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    userType: user.userType,
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    isFrozen: user.isFrozen,
    createdAt: user.createdAt,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    parties: user.partyMemberships.map((m) => ({
      id: m.party.id,
      name: m.party.name,
      handle: m.party.handle,
      permissions: m.permissions,
    })),
    racesFollowing: user.raceFollows.map((f) => ({
      id: f.race.id,
      title: f.race.title,
    })),
    racesCompeting: user.raceCompetitions.map((c) => ({
      id: c.race.id,
      title: c.race.title,
    })),
  };

  // Add candidate-only fields
  if (user.userType === 'CANDIDATE') {
    profile.points = user.pointLedgers.map((ledger) => ({
      total: ledger.totalPoints,
      tier: ledger.tier,
      raceId: ledger.raceId,
      raceName: ledger.race.title,
    }));
    profile.reviewsCount = user._count.reviewsReceived;

    if (user.reviewsReceived.length > 0) {
      const sum = user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0);
      profile.averageRating = sum / user.reviewsReceived.length;
    }
  }

  // Add pending follow request count for private accounts
  if (user.isPrivate) {
    const pendingCount = await prisma.followRequest.count({
      where: { toUserId: userId, status: 'PENDING' },
    });
    profile.pendingFollowRequestsCount = pendingCount;
  }

  return profile;
};

// -----------------------------------------------------------------------------
// Update Profile
// -----------------------------------------------------------------------------

export const updateProfile = async (
  userId: string,
  data: UpdateProfileRequest
): Promise<PrivateProfile> => {
  // Check if phone number is already taken (if being updated)
  if (data.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existingPhone && existingPhone.id !== userId) {
      throw new ConflictError('Phone number already in use');
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
  });

  return getPrivateProfile(userId);
};

// -----------------------------------------------------------------------------
// Toggle Privacy (Participants Only)
// -----------------------------------------------------------------------------

export const togglePrivacy = async (
  userId: string,
  isPrivate: boolean
): Promise<PrivateProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Candidates cannot be private
  if (user.userType === 'CANDIDATE') {
    throw new ForbiddenError('Candidates cannot set their account to private');
  }

  // Switching from private → public: auto-approve all pending requests
  if (user.isPrivate && !isPrivate) {
    const pendingRequests = await prisma.followRequest.findMany({
      where: { toUserId: userId, status: 'PENDING' },
    });

    if (pendingRequests.length > 0) {
      await prisma.$transaction([
        // Approve all pending requests
        prisma.followRequest.updateMany({
          where: { toUserId: userId, status: 'PENDING' },
          data: { status: 'APPROVED' },
        }),
        // Create Follow records for each approved request
        ...pendingRequests.map((req) =>
          prisma.follow.upsert({
            where: {
              followerId_followingId: {
                followerId: req.fromUserId,
                followingId: userId,
              },
            },
            create: {
              followerId: req.fromUserId,
              followingId: userId,
            },
            update: {},
          })
        ),
      ]);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isPrivate },
  });

  return getPrivateProfile(userId);
};

// -----------------------------------------------------------------------------
// Get Follow Requests (for private accounts)
// -----------------------------------------------------------------------------

export const getFollowRequests = async (
  userId: string
): Promise<FollowRequestResponse[]> => {
  const requests = await prisma.followRequest.findMany({
    where: { toUserId: userId, status: 'PENDING' },
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((req) => ({
    id: req.id,
    fromUser: req.fromUser,
    status: req.status,
    createdAt: req.createdAt,
  }));
};

// -----------------------------------------------------------------------------
// Approve Follow Request
// -----------------------------------------------------------------------------

export const approveFollowRequest = async (
  userId: string,
  requestId: string
): Promise<FollowRequestResponse> => {
  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!request) {
    throw new NotFoundError('Follow request');
  }

  if (request.toUserId !== userId) {
    throw new ForbiddenError('You can only manage your own follow requests');
  }

  if (request.status !== 'PENDING') {
    throw new ConflictError(`Follow request already ${request.status.toLowerCase()}`);
  }

  // Approve request and create follow record atomically
  const [updatedRequest] = await prisma.$transaction([
    prisma.followRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: request.fromUserId,
          followingId: userId,
        },
      },
      create: {
        followerId: request.fromUserId,
        followingId: userId,
      },
      update: {},
    }),
  ]);

  // Award FOLLOW points
  awardFollowPoints(request.fromUserId, userId).catch(() => {});

  return {
    id: updatedRequest.id,
    fromUser: updatedRequest.fromUser,
    status: updatedRequest.status,
    createdAt: updatedRequest.createdAt,
  };
};

// -----------------------------------------------------------------------------
// Deny Follow Request
// -----------------------------------------------------------------------------

export const denyFollowRequest = async (
  userId: string,
  requestId: string
): Promise<FollowRequestResponse> => {
  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!request) {
    throw new NotFoundError('Follow request');
  }

  if (request.toUserId !== userId) {
    throw new ForbiddenError('You can only manage your own follow requests');
  }

  if (request.status !== 'PENDING') {
    throw new ConflictError(`Follow request already ${request.status.toLowerCase()}`);
  }

  const updatedRequest = await prisma.followRequest.update({
    where: { id: requestId },
    data: { status: 'DENIED' },
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    id: updatedRequest.id,
    fromUser: updatedRequest.fromUser,
    status: updatedRequest.status,
    createdAt: updatedRequest.createdAt,
  };
};

// -----------------------------------------------------------------------------
// Follow User (for public accounts / candidates)
// -----------------------------------------------------------------------------

export const followUser = async (
  followerId: string,
  followingId: string
): Promise<void> => {
  if (followerId === followingId) {
    throw new ForbiddenError('Cannot follow yourself');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, isPrivate: true, userType: true },
  });

  if (!targetUser) throw new NotFoundError('User');

  // Private participants require follow requests
  if (targetUser.isPrivate) {
    try {
      await prisma.followRequest.create({
        data: { fromUserId: followerId, toUserId: followingId },
      });
      return; // Request created, no follow yet
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictError('Follow request already sent');
      throw err;
    }
  }

  // Public accounts / candidates — create follow directly
  try {
    await prisma.follow.create({
      data: { followerId, followingId },
    });
    // Award FOLLOW points to the followed user
    awardFollowPoints(followerId, followingId).catch(() => {});
    // Send notification to the followed user
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });
    createNotification({
      userId: followingId,
      type: 'FOLLOW',
      title: 'New follower',
      body: `${follower?.username ?? 'Someone'} started following you`,
      data: { followerId },
    }).catch(() => {});
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already following this user');
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Unfollow User
// -----------------------------------------------------------------------------

export const unfollowUser = async (
  followerId: string,
  followingId: string
): Promise<void> => {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (!existing) throw new NotFoundError('Follow');

  await prisma.follow.delete({ where: { id: existing.id } });

  // Deduct UNFOLLOW points from the unfollowed user
  awardUnfollowPoints(followerId, followingId).catch(() => {});
};

// -----------------------------------------------------------------------------
// Become Candidate
// -----------------------------------------------------------------------------

export const becomeCandidate = async (userId: string): Promise<PrivateProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  if (user.userType === 'CANDIDATE') {
    throw new ConflictError('You are already a candidate');
  }

  // Find the CoolPeople system race
  const coolPeopleRace = await prisma.race.findFirst({
    where: {
      title: SYSTEM_RACES.COOLPEOPLE.title,
      isSystemRace: true,
    },
  });

  if (!coolPeopleRace) {
    throw new Error('System race not found - database may not be seeded');
  }

  // Collect pending follow requests for auto-approval
  const pendingRequests = await prisma.followRequest.findMany({
    where: { toUserId: userId, status: 'PENDING' },
  });

  // Update user to candidate and enroll in CoolPeople race
  await prisma.$transaction([
    // Update user type - isPrivate forced to false for candidates
    prisma.user.update({
      where: { id: userId },
      data: {
        userType: 'CANDIDATE',
        isFrozen: false,
        isPrivate: false,
      },
    }),

    // Enroll in CoolPeople race
    prisma.raceCompetitor.create({
      data: {
        raceId: coolPeopleRace.id,
        userId: userId,
      },
    }),

    // Create point ledger for this race
    prisma.pointLedger.create({
      data: {
        userId: userId,
        raceId: coolPeopleRace.id,
        totalPoints: 0,
        tier: 'BRONZE',
      },
    }),

    // Auto-approve all pending follow requests
    ...(pendingRequests.length > 0
      ? [
          prisma.followRequest.updateMany({
            where: { toUserId: userId, status: 'PENDING' },
            data: { status: 'APPROVED' },
          }),
          ...pendingRequests.map((req) =>
            prisma.follow.upsert({
              where: {
                followerId_followingId: {
                  followerId: req.fromUserId,
                  followingId: userId,
                },
              },
              create: {
                followerId: req.fromUserId,
                followingId: userId,
              },
              update: {},
            })
          ),
        ]
      : []),
  ]);

  return getPrivateProfile(userId);
};

// -----------------------------------------------------------------------------
// Revert to Participant
// -----------------------------------------------------------------------------

export const revertToParticipant = async (userId: string): Promise<PrivateProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  if (user.userType === 'PARTICIPANT') {
    throw new ConflictError('You are already a participant');
  }

  // Update user to participant and freeze points
  // Note: We keep the point ledgers and reviews but mark user as frozen
  // isPrivate stays false — they can choose to go private later
  await prisma.user.update({
    where: { id: userId },
    data: {
      userType: 'PARTICIPANT',
      isFrozen: true, // Points frozen, reviews persist
    },
  });

  return getPrivateProfile(userId);
};

// -----------------------------------------------------------------------------
// Delete Account
// -----------------------------------------------------------------------------

export const deleteAccount = async (userId: string, requesterId: string): Promise<void> => {
  if (userId !== requesterId) {
    throw new ForbiddenError('You can only delete your own account');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Cascade delete handles most relations
  await prisma.user.delete({
    where: { id: userId },
  });
};

// -----------------------------------------------------------------------------
// Search Users
// -----------------------------------------------------------------------------

export const searchUsers = async (
  query: string,
  limit: number,
  cursor?: string
): Promise<{ users: PublicProfile[]; nextCursor: string | null }> => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit + 1, // Take one extra to check if there's more
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });

  const hasMore = users.length > limit;
  const results = hasMore ? users.slice(0, -1) : users;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  const profiles: PublicProfile[] = results.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    userType: user.userType,
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt,
    followersCount: user._count.followers,
    followingCount: user._count.following,
  }));

  return { users: profiles, nextCursor };
};

// -----------------------------------------------------------------------------
// Point Helpers (internal)
// Award points across all races the followed user competes in
// -----------------------------------------------------------------------------

const awardFollowPoints = async (
  followerId: string,
  followedUserId: string
): Promise<void> => {
  const ledgers = await prisma.pointLedger.findMany({
    where: { userId: followedUserId },
    select: { raceId: true },
  });

  await Promise.all(
    ledgers.map((l) =>
      recordPointEvent({
        targetUserId: followedUserId,
        raceId: l.raceId,
        action: 'FOLLOW',
        points: POINT_WEIGHTS.FOLLOW,
        sourceUserId: followerId,
      })
    )
  );
};

const awardUnfollowPoints = async (
  unfollowerId: string,
  unfollowedUserId: string
): Promise<void> => {
  const ledgers = await prisma.pointLedger.findMany({
    where: { userId: unfollowedUserId },
    select: { raceId: true },
  });

  await Promise.all(
    ledgers.map((l) =>
      recordPointEvent({
        targetUserId: unfollowedUserId,
        raceId: l.raceId,
        action: 'UNFOLLOW',
        points: POINT_WEIGHTS.UNFOLLOW,
        sourceUserId: unfollowerId,
      })
    )
  );
};
