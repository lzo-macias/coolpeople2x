/**
 * Reels Service
 * Business logic for reel CRUD, engagement, and feed algorithm
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { recordReelEngagementPoints } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { ReelResponse, CreateReelRequest, FeedReel } from './reels.types.js';

// -----------------------------------------------------------------------------
// Helpers: Parse hashtags and mentions from description
// -----------------------------------------------------------------------------

const parseHashtags = (text: string): string[] => {
  const matches = text.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
};

const parseMentions = (text: string): string[] => {
  const matches = text.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
};

// -----------------------------------------------------------------------------
// Helper: Format reel for API response
// -----------------------------------------------------------------------------

const formatReel = (
  reel: any,
  viewerId?: string
): ReelResponse => {
  // Get user's primary party from their partyId relation (displayed sitewide)
  const userParty = reel.user.party;

  return {
    id: reel.id,
    // Use 'user' to match frontend expectations
    user: {
      id: reel.user.id,
      username: reel.user.username,
      displayName: reel.user.displayName,
      avatar: reel.user.avatarUrl,
      avatarUrl: reel.user.avatarUrl,
      party: userParty?.name ?? null,
      isParticipant: reel.user.userType === 'PARTICIPANT',
    },
    // Keep creator for backwards compatibility
    creator: {
      id: reel.user.id,
      username: reel.user.username,
      displayName: reel.user.displayName,
      avatarUrl: reel.user.avatarUrl,
    },
    partyId: reel.partyId ?? null,
    isPartyPost: reel.isPartyPost ?? false, // True = party-only post, False = user post (may also be in party feed)
    party: reel.party
      ? { id: reel.party.id, name: reel.party.name, handle: reel.party.handle, avatarUrl: reel.party.avatarUrl }
      : null,
    videoUrl: reel.videoUrl,
    thumbnailUrl: reel.thumbnailUrl,
    thumbnail: reel.thumbnailUrl, // Alias for frontend compatibility
    selfieOverlayUrl: reel.selfieOverlayUrl,
    duration: reel.duration,
    title: reel.title,
    description: reel.description,
    caption: reel.description, // Frontend uses 'caption'
    isMirrored: reel.isMirrored ?? false,
    likeCount: reel.likeCount,
    commentCount: reel.commentCount,
    shareCount: reel.shareCount,
    saveCount: reel.saveCount,
    repostCount: reel.repostCount,
    viewCount: reel.viewCount,
    stats: {
      likes: String(reel.likeCount || 0),
      comments: String(reel.commentCount || 0),
      shares: String(reel.shareCount || 0),
      saves: String(reel.saveCount || 0),
      reposts: String(reel.repostCount || 0),
      votes: '0',
      shazam: '0',
    },
    isLiked: viewerId ? reel.likes?.some((l: any) => l.userId === viewerId) : undefined,
    isSaved: viewerId ? reel.saves?.some((s: any) => s.userId === viewerId) : undefined,
    isReposted: viewerId ? reel.reposts?.some((r: any) => r.userId === viewerId) : undefined,
    hashtags: reel.hashtags?.map((h: any) => h.hashtag.name) ?? [],
    mentions: reel.mentions?.map((m: any) => ({ id: m.user.id, username: m.user.username })) ?? [],
    raceTargets: reel.raceTargets?.map((t: any) => ({ id: t.race.id, title: t.race.title })) ?? [],
    targetRace: reel.raceTargets?.[0]?.race?.title ?? null,
    quoteParent: reel.quoteParent
      ? {
          id: reel.quoteParent.id,
          creator: { id: reel.quoteParent.user.id, username: reel.quoteParent.user.username },
          thumbnailUrl: reel.quoteParent.thumbnailUrl,
        }
      : null,
    createdAt: reel.createdAt,
  };
};

// Standard includes for reel queries
const reelIncludes = (viewerId?: string) => ({
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      userType: true,
      // Primary party from partyId relation (displayed sitewide)
      party: {
        select: { id: true, name: true, handle: true },
      },
    },
  },
  party: {
    select: { id: true, name: true, handle: true, avatarUrl: true },
  },
  hashtags: {
    include: { hashtag: { select: { name: true } } },
  },
  mentions: {
    include: { user: { select: { id: true, username: true } } },
  },
  raceTargets: {
    include: { race: { select: { id: true, title: true } } },
  },
  quoteParent: {
    include: {
      user: { select: { id: true, username: true } },
    },
  },
  ...(viewerId && {
    likes: { where: { userId: viewerId }, take: 1 },
    saves: { where: { userId: viewerId }, take: 1 },
    reposts: { where: { userId: viewerId }, take: 1 },
  }),
});

// -----------------------------------------------------------------------------
// Create Reel
// -----------------------------------------------------------------------------

export const createReel = async (
  userId: string,
  data: CreateReelRequest
): Promise<ReelResponse> => {
  // If posting to a party, verify membership with 'post' permission
  if (data.partyId) {
    const membership = await prisma.partyMembership.findUnique({
      where: { userId_partyId: { userId, partyId: data.partyId } },
    });
    if (!membership || !membership.permissions.includes('post')) {
      throw new ForbiddenError('You do not have permission to post for this party');
    }
  }

  // If quoting, verify parent exists
  if (data.quoteParentId) {
    const parent = await prisma.reel.findUnique({
      where: { id: data.quoteParentId },
    });
    if (!parent || parent.deletedAt) {
      throw new NotFoundError('Quote parent reel');
    }
  }

  // Parse hashtags and mentions from description
  const hashtagNames = data.description ? parseHashtags(data.description) : [];
  const mentionUsernames = data.description ? parseMentions(data.description) : [];

  // Resolve mention usernames to user IDs
  const mentionedUsers = mentionUsernames.length > 0
    ? await prisma.user.findMany({
        where: { username: { in: mentionUsernames } },
        select: { id: true, username: true },
      })
    : [];

  // Upsert hashtags
  const hashtags = await Promise.all(
    hashtagNames.map(async (name) => {
      return prisma.hashtag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    })
  );

  const reel = await prisma.reel.create({
    data: {
      userId,
      partyId: data.partyId,
      isPartyPost: data.isPartyPost ?? false, // True = party-only, False = user post (may also be in party feed)
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      selfieOverlayUrl: data.selfieOverlayUrl,
      duration: data.duration,
      isMirrored: data.isMirrored ?? false,
      title: data.title,
      description: data.description,
      quoteParentId: data.quoteParentId,
      soundId: data.soundId,
      locationId: data.locationId,
      // Create hashtag associations
      hashtags: {
        create: hashtags.map((h) => ({ hashtagId: h.id })),
      },
      // Create mention associations
      mentions: {
        create: mentionedUsers.map((u) => ({ userId: u.id })),
      },
      // Create race target associations
      ...(data.raceIds && data.raceIds.length > 0 && {
        raceTargets: {
          create: data.raceIds.map((raceId) => ({ raceId })),
        },
      }),
    },
    include: reelIncludes(userId),
  });

  return formatReel(reel, userId);
};

// -----------------------------------------------------------------------------
// Get Reel by ID
// -----------------------------------------------------------------------------

export const getReel = async (
  reelId: string,
  viewerId?: string
): Promise<ReelResponse> => {
  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
    include: reelIncludes(viewerId),
  });

  if (!reel || reel.deletedAt) {
    throw new NotFoundError('Reel');
  }

  return formatReel(reel, viewerId);
};

// -----------------------------------------------------------------------------
// Delete Reel (soft delete)
// -----------------------------------------------------------------------------

export const deleteReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
  });

  if (!reel || reel.deletedAt) {
    throw new NotFoundError('Reel');
  }

  if (reel.userId !== userId) {
    throw new ForbiddenError('You can only delete your own reels');
  }

  await prisma.reel.update({
    where: { id: reelId },
    data: { deletedAt: new Date() },
  });
};

// -----------------------------------------------------------------------------
// Get User Reels
// -----------------------------------------------------------------------------

export const getUserReels = async (
  userId: string,
  viewerId?: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reels: ReelResponse[]; nextCursor: string | null }> => {
  const reels = await prisma.reel.findMany({
    where: { userId, deletedAt: null, isPartyPost: false }, // Exclude party-only posts, include both-feeds posts
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: reelIncludes(viewerId),
  });

  const hasMore = reels.length > limit;
  const results = hasMore ? reels.slice(0, -1) : reels;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    reels: results.map((r) => formatReel(r, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Get Party Reels
// -----------------------------------------------------------------------------

export const getPartyReels = async (
  partyId: string,
  viewerId?: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reels: ReelResponse[]; nextCursor: string | null }> => {
  const reels = await prisma.reel.findMany({
    where: { partyId, deletedAt: null },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: reelIncludes(viewerId),
  });

  const hasMore = reels.length > limit;
  const results = hasMore ? reels.slice(0, -1) : reels;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    reels: results.map((r) => formatReel(r, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Like / Unlike Reel
// -----------------------------------------------------------------------------

export const likeReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  try {
    await prisma.$transaction([
      prisma.like.create({ data: { userId, reelId } }),
      prisma.reel.update({ where: { id: reelId }, data: { likeCount: { increment: 1 } } }),
    ]);

    // Skip affinity, points, and notifications for self-likes
    if (reel.userId !== userId) {
      // Update affinity asynchronously
      updateAffinity(userId, reel.userId, 1).catch(() => {});
      // Award points to reel creator
      recordReelEngagementPoints(reelId, reel.userId, userId, 'LIKE').catch(() => {});
      // Notification for reel creator
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, avatarUrl: true },
      });
      createNotification({
        userId: reel.userId,
        type: 'LIKE',
        title: 'New like',
        body: `${liker?.username ?? 'Someone'} liked your reel`,
        data: {
          reelId,
          userId,
          actorId: userId,
          actorUsername: liker?.username,
          actorAvatarUrl: liker?.avatarUrl,
          thumbnailUrl: reel.thumbnailUrl,
        },
      }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already liked');
    throw err;
  }
};

export const unlikeReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const existing = await prisma.like.findUnique({
    where: { userId_reelId: { userId, reelId } },
  });
  if (!existing) throw new NotFoundError('Like');

  await prisma.$transaction([
    prisma.like.delete({ where: { id: existing.id } }),
    prisma.reel.update({ where: { id: reelId }, data: { likeCount: { decrement: 1 } } }),
  ]);
};

// -----------------------------------------------------------------------------
// Save / Unsave Reel
// -----------------------------------------------------------------------------

export const saveReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  try {
    await prisma.$transaction([
      prisma.save.create({ data: { userId, reelId } }),
      prisma.reel.update({ where: { id: reelId }, data: { saveCount: { increment: 1 } } }),
    ]);
    if (reel.userId !== userId) {
      updateAffinity(userId, reel.userId, 5).catch(() => {});
      recordReelEngagementPoints(reelId, reel.userId, userId, 'SAVE').catch(() => {});
    }
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already saved');
    throw err;
  }
};

export const unsaveReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const existing = await prisma.save.findUnique({
    where: { userId_reelId: { userId, reelId } },
  });
  if (!existing) throw new NotFoundError('Save');

  await prisma.$transaction([
    prisma.save.delete({ where: { id: existing.id } }),
    prisma.reel.update({ where: { id: reelId }, data: { saveCount: { decrement: 1 } } }),
  ]);
};

// -----------------------------------------------------------------------------
// Share Reel
// -----------------------------------------------------------------------------

export const shareReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  await prisma.$transaction([
    prisma.share.create({ data: { userId, reelId } }),
    prisma.reel.update({ where: { id: reelId }, data: { shareCount: { increment: 1 } } }),
  ]);

  if (reel.userId !== userId) {
    updateAffinity(userId, reel.userId, 5).catch(() => {});
    recordReelEngagementPoints(reelId, reel.userId, userId, 'SHARE').catch(() => {});
  }
};

// -----------------------------------------------------------------------------
// Repost / Unrepost Reel
// -----------------------------------------------------------------------------

export const repostReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');
  if (reel.userId === userId) throw new ForbiddenError('Cannot repost your own reel');

  try {
    await prisma.$transaction([
      prisma.repost.create({ data: { userId, reelId } }),
      prisma.reel.update({ where: { id: reelId }, data: { repostCount: { increment: 1 } } }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already reposted');
    throw err;
  }
};

export const unrepostReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const existing = await prisma.repost.findUnique({
    where: { userId_reelId: { userId, reelId } },
  });
  if (!existing) throw new NotFoundError('Repost');

  await prisma.$transaction([
    prisma.repost.delete({ where: { id: existing.id } }),
    prisma.reel.update({ where: { id: reelId }, data: { repostCount: { decrement: 1 } } }),
  ]);
};

// -----------------------------------------------------------------------------
// Get User Activity (likes, comments, reposts)
// -----------------------------------------------------------------------------

export const getUserActivity = async (
  userId: string,
  limit: number = 50
): Promise<any[]> => {
  // Fetch likes and comments in parallel (reposts have their own tab)
  const [likes, comments] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reel: { include: reelIncludes(userId) },
      },
    }),
    prisma.comment.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reel: { include: reelIncludes(userId) },
      },
    }),
  ]);

  // Get user info for the actor field
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });

  const actor = user
    ? { username: user.username, displayName: user.displayName, avatar: user.avatarUrl }
    : { username: 'Unknown', displayName: 'Unknown', avatar: null };

  // Build unified activity list
  const activities: any[] = [];

  for (const like of likes) {
    if (!like.reel || like.reel.deletedAt) continue;
    const formatted = formatReel(like.reel, userId);
    activities.push({
      id: `act-like-${like.id}`,
      type: 'like',
      action: 'liked',
      timestamp: like.createdAt,
      actor,
      reel: formatted,
    });
  }

  for (const comment of comments) {
    if (!comment.reel || comment.reel.deletedAt) continue;
    const formatted = formatReel(comment.reel, userId);
    activities.push({
      id: `act-comment-${comment.id}`,
      type: 'comment',
      action: 'commented',
      timestamp: comment.createdAt,
      actor,
      reel: formatted,
    });
  }

  // Sort by timestamp descending, take the limit
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, limit);
};

// -----------------------------------------------------------------------------
// Get User Reposts
// -----------------------------------------------------------------------------

export const getUserReposts = async (
  userId: string,
  viewerId?: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reels: ReelResponse[]; nextCursor: string | null }> => {
  const reposts = await prisma.repost.findMany({
    where: { userId },
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
        },
      },
      reel: {
        include: reelIncludes(viewerId),
      },
    },
  });

  const hasMore = reposts.length > limit;
  const results = hasMore ? reposts.slice(0, -1) : reposts;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Filter out deleted reels and format with repostedBy info
  const reels = results
    .filter((r) => r.reel && !r.reel.deletedAt)
    .map((r) => ({
      ...formatReel(r.reel, viewerId),
      repostedBy: {
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
      },
      repostedAt: r.createdAt,
    }));

  return { reels, nextCursor };
};

// -----------------------------------------------------------------------------
// Record Watch Event (View)
// -----------------------------------------------------------------------------

export const recordView = async (
  reelId: string,
  userId: string,
  watchPercent: number
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  await prisma.watchEvent.create({
    data: { userId, reelId, watchPercent },
  });

  // Increment view count (only once per watch event)
  await prisma.reel.update({
    where: { id: reelId },
    data: { viewCount: { increment: 1 } },
  });

  // Update affinity based on watch completion
  if (reel.userId !== userId) {
    const increment = watchPercent >= 0.8 ? 2 : watchPercent >= 0.3 ? 0.5 : 0;
    if (increment > 0) {
      updateAffinity(userId, reel.userId, increment).catch(() => {});
    }
    // Award points based on watch completion
    const pointAction = watchPercent >= 0.8 ? 'WATCH_FULL' : watchPercent >= 0.3 ? 'WATCH_PARTIAL' : null;
    if (pointAction) {
      recordReelEngagementPoints(reelId, reel.userId, userId, pointAction).catch(() => {});
    }
  }
};

// -----------------------------------------------------------------------------
// Hide Reel / Hide User
// -----------------------------------------------------------------------------

export const hideReel = async (
  reelId: string,
  userId: string
): Promise<void> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  try {
    await prisma.hide.create({
      data: { userId, hiddenReelId: reelId },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already hidden');
    throw err;
  }
};

export const hideUser = async (
  hiddenUserId: string,
  userId: string
): Promise<void> => {
  if (hiddenUserId === userId) throw new ForbiddenError('Cannot hide yourself');

  try {
    await prisma.hide.create({
      data: { userId, hiddenUserId },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already hidden');
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Feed: For You Feed (MVP)
// Shows ALL reels, weighted by: recency + favorite boost + affinity + popularity
// Later: Add vector embeddings for personalized recommendations
// -----------------------------------------------------------------------------

export const getFollowingFeed = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reels: FeedReel[]; nextCursor: string | null }> => {
  const offset = cursor ? parseInt(cursor, 10) : 0;

  // Raw SQL for weighted feed scoring
  // Shows ALL reels (global feed), prioritized by engagement signals
  // Hidden/blocked users are filtered out
  const feedReels: any[] = await prisma.$queryRaw`
    SELECT r.id,
      GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - r."createdAt")) / 3600 * 2) as recency_score,
      CASE WHEN fav.id IS NOT NULL THEN 50 ELSE 0 END as favorite_boost,
      COALESCE(a.score, 0) * 20 as affinity_score,
      (r."likeCount" + r."commentCount" + r."shareCount") * 0.5 as popularity_score,
      CASE WHEN r."userId" = ${userId} THEN 25 ELSE 0 END as own_post_boost,
      CASE WHEN fo.id IS NOT NULL THEN 10 ELSE 0 END as following_boost,
      (
        GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - r."createdAt")) / 3600 * 2) +
        CASE WHEN fav.id IS NOT NULL THEN 50 ELSE 0 END +
        COALESCE(a.score, 0) * 20 +
        (r."likeCount" + r."commentCount" + r."shareCount") * 0.5 +
        CASE WHEN r."userId" = ${userId} THEN 25 ELSE 0 END +
        CASE WHEN fo.id IS NOT NULL THEN 10 ELSE 0 END
      ) as total_score
    FROM "Reel" r
    JOIN "User" u ON r."userId" = u.id
    LEFT JOIN "Follow" fo ON r."userId" = fo."followingId" AND fo."followerId" = ${userId}
    LEFT JOIN "Favorite" fav ON r."userId" = fav."favoritedUserId" AND fav."userId" = ${userId}
    LEFT JOIN "UserAffinity" a ON r."userId" = a."targetUserId" AND a."userId" = ${userId}
    LEFT JOIN "Hide" h ON (
      (h."hiddenReelId" = r.id OR h."hiddenUserId" = r."userId")
      AND h."userId" = ${userId}
    )
    LEFT JOIN "Block" b ON r."userId" = b."blockedId" AND b."blockerId" = ${userId}
    WHERE r."deletedAt" IS NULL
      AND h.id IS NULL
      AND b.id IS NULL
    ORDER BY total_score DESC, r."createdAt" DESC
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `;

  const hasMore = feedReels.length > limit;
  const results = hasMore ? feedReels.slice(0, -1) : feedReels;
  const nextCursor = hasMore ? String(offset + limit) : null;

  // Fetch full reel data for the results
  if (results.length === 0) {
    return { reels: [], nextCursor: null };
  }

  const reelIds = results.map((r: any) => r.id);
  const fullReels = await prisma.reel.findMany({
    where: { id: { in: reelIds } },
    include: reelIncludes(userId),
  });

  // Maintain feed score ordering
  const reelMap = new Map(fullReels.map((r) => [r.id, r]));
  const orderedReels = results
    .map((r: any) => reelMap.get(r.id))
    .filter(Boolean)
    .map((r: any) => formatReel(r, userId));

  // Fetch reposts from users the current user follows (exclude own reposts)
  const followedUserIds = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const repostUserIds = followedUserIds.map((f) => f.followingId);

  const userReposts = await prisma.repost.findMany({
    where: {
      userId: { in: repostUserIds },
      reel: { deletedAt: null },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      reel: {
        include: reelIncludes(userId),
      },
    },
  });

  // Create repost entries with repostedBy info
  const repostEntries = userReposts
    .filter((rp) => rp.reel && !rp.reel.deletedAt)
    .map((rp) => {
      const formattedReel = formatReel(rp.reel, userId);
      return {
        ...formattedReel,
        id: `repost-${rp.reel.id}-${rp.createdAt.getTime()}`,
        originalReelId: rp.reel.id,
        repostedBy: {
          id: rp.user.id,
          username: rp.user.username,
          displayName: rp.user.displayName,
          avatarUrl: rp.user.avatarUrl,
        },
        repostedAt: rp.createdAt,
      };
    });

  // Merge reposts into feed, sorted by repostedAt/createdAt
  const mergedFeed = [...repostEntries, ...orderedReels].sort((a, b) => {
    const dateA = (a as any).repostedAt || a.createdAt;
    const dateB = (b as any).repostedAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return { reels: mergedFeed, nextCursor };
};

// -----------------------------------------------------------------------------
// User Affinity Update
// -----------------------------------------------------------------------------

const updateAffinity = async (
  userId: string,
  targetUserId: string,
  increment: number
): Promise<void> => {
  if (userId === targetUserId) return;

  await prisma.userAffinity.upsert({
    where: { userId_targetUserId: { userId, targetUserId } },
    update: { score: { increment } },
    create: { userId, targetUserId, score: increment },
  });
};
