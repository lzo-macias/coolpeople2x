/**
 * Races Service
 * Business logic for race CRUD, follow, compete, nominate, and scoreboard
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type {
  RaceResponse,
  CompetitorResponse,
  ScoreboardEntry,
  NominationResponse,
  CreateRaceRequest,
  UpdateRaceRequest,
} from './races.types.js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const formatRace = (race: any, viewerId?: string): RaceResponse => ({
  id: race.id,
  title: race.title,
  description: race.description,
  bannerUrl: race.bannerUrl,
  raceType: race.raceType,
  winCondition: race.winCondition,
  endDate: race.endDate,
  ballotOpenDate: race.ballotOpenDate,
  isSystemRace: race.isSystemRace,
  creatorId: race.creatorId,
  competitorCount: race._count?.competitors ?? 0,
  followerCount: race._count?.followers ?? 0,
  isFollowing: viewerId
    ? race.followers?.some((f: any) => f.userId === viewerId)
    : undefined,
  isCompeting: viewerId
    ? race.competitors?.some((c: any) => c.userId === viewerId)
    : undefined,
  createdAt: race.createdAt,
});

const raceIncludes = (viewerId?: string) => ({
  _count: {
    select: { competitors: true, followers: true },
  },
  ...(viewerId && {
    followers: { where: { userId: viewerId }, take: 1 },
    competitors: { where: { userId: viewerId }, take: 1 },
  }),
});

// -----------------------------------------------------------------------------
// Create Race
// -----------------------------------------------------------------------------

export const createRace = async (
  data: CreateRaceRequest,
  creatorId: string
): Promise<RaceResponse> => {
  const race = await prisma.race.create({
    data: {
      title: data.title,
      description: data.description,
      bannerUrl: data.bannerUrl,
      raceType: data.raceType,
      winCondition: data.winCondition,
      endDate: data.endDate ? new Date(data.endDate) : null,
      ballotOpenDate: data.ballotOpenDate ? new Date(data.ballotOpenDate) : null,
      creatorId,
    },
    include: raceIncludes(creatorId),
  });

  // Auto-follow the race for the creator
  await prisma.raceFollow.create({
    data: { userId: creatorId, raceId: race.id },
  });

  return formatRace(race, creatorId);
};

// -----------------------------------------------------------------------------
// Get Race by ID
// -----------------------------------------------------------------------------

export const getRace = async (
  raceId: string,
  viewerId?: string
): Promise<RaceResponse> => {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: raceIncludes(viewerId),
  });

  if (!race) {
    throw new NotFoundError('Race');
  }

  return formatRace(race, viewerId);
};

// -----------------------------------------------------------------------------
// Update Race
// -----------------------------------------------------------------------------

export const updateRace = async (
  raceId: string,
  data: UpdateRaceRequest
): Promise<RaceResponse> => {
  const race = await prisma.race.update({
    where: { id: raceId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.ballotOpenDate !== undefined && {
        ballotOpenDate: data.ballotOpenDate ? new Date(data.ballotOpenDate) : null,
      }),
    },
    include: raceIncludes(),
  });

  return formatRace(race);
};

// -----------------------------------------------------------------------------
// Delete Race
// -----------------------------------------------------------------------------

export const deleteRace = async (raceId: string): Promise<void> => {
  await prisma.race.delete({ where: { id: raceId } });
};

// -----------------------------------------------------------------------------
// List Races
// -----------------------------------------------------------------------------

export const listRaces = async (
  filters: { type?: string; search?: string },
  cursor?: string,
  limit: number = 20,
  viewerId?: string
): Promise<{ races: RaceResponse[]; nextCursor: string | null }> => {
  const where: any = {};
  if (filters.type) where.raceType = filters.type;
  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  const races = await prisma.race.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: raceIncludes(viewerId),
  });

  const hasMore = races.length > limit;
  const results = hasMore ? races.slice(0, -1) : races;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    races: results.map((r) => formatRace(r, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Follow / Unfollow Race
// -----------------------------------------------------------------------------

export const followRace = async (
  userId: string,
  raceId: string
): Promise<void> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  try {
    await prisma.raceFollow.create({ data: { userId, raceId } });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already following this race');
    throw err;
  }
};

export const unfollowRace = async (
  userId: string,
  raceId: string
): Promise<void> => {
  const existing = await prisma.raceFollow.findUnique({
    where: { userId_raceId: { userId, raceId } },
  });
  if (!existing) throw new NotFoundError('Race follow');

  await prisma.raceFollow.delete({ where: { id: existing.id } });
};

// -----------------------------------------------------------------------------
// Compete / Leave Race
// -----------------------------------------------------------------------------

export const competeInRace = async (
  userId: string,
  raceId: string
): Promise<void> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  // Only candidates can compete in candidate races
  if (race.raceType === 'CANDIDATE_VS_CANDIDATE') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    if (user?.userType !== 'CANDIDATE') {
      throw new ForbiddenError('Only candidates can compete in candidate races');
    }
  }

  try {
    await prisma.$transaction([
      prisma.raceCompetitor.create({ data: { raceId, userId } }),
      // Create point ledger for this race
      prisma.pointLedger.create({
        data: { userId, raceId, totalPoints: 0, tier: 'BRONZE' },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already competing in this race');
    throw err;
  }
};

export const leaveRace = async (
  userId: string,
  raceId: string
): Promise<void> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.isSystemRace) {
    throw new ForbiddenError('Cannot leave system races');
  }

  const competitor = await prisma.raceCompetitor.findUnique({
    where: { raceId_userId: { raceId, userId } },
  });
  if (!competitor) throw new NotFoundError('Race competitor');

  // Delete both competitor entry and point ledger
  await prisma.$transaction([
    prisma.raceCompetitor.delete({ where: { id: competitor.id } }),
    prisma.pointLedger.deleteMany({ where: { userId, raceId } }),
  ]);
};

// -----------------------------------------------------------------------------
// Remove User from All Races (when userType changes to PARTICIPANT)
// -----------------------------------------------------------------------------

export const removeUserFromAllRaces = async (userId: string): Promise<void> => {
  // Delete all race competitor entries for this user
  await prisma.raceCompetitor.deleteMany({ where: { userId } });

  // Delete all point ledger entries for this user
  await prisma.pointLedger.deleteMany({ where: { userId } });

  console.log(`Removed user ${userId} from all races`);
};

// -----------------------------------------------------------------------------
// Get Competitors (ranked)
// -----------------------------------------------------------------------------

export const getCompetitors = async (
  raceId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ competitors: CompetitorResponse[]; nextCursor: string | null }> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  // For CANDIDATE_VS_CANDIDATE races, only show candidates
  // For PARTY_VS_PARTY races, only show parties
  const whereClause: any = { raceId };
  if (race.raceType === 'CANDIDATE_VS_CANDIDATE') {
    whereClause.user = { userType: 'CANDIDATE' };
    whereClause.userId = { not: null };
  } else if (race.raceType === 'PARTY_VS_PARTY') {
    whereClause.partyId = { not: null };
  }

  const ledgers = await prisma.pointLedger.findMany({
    where: whereClause,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { totalPoints: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          userType: true,
          party: { select: { id: true, name: true } },
        },
      },
      party: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  const hasMore = ledgers.length > limit;
  const results = hasMore ? ledgers.slice(0, -1) : ledgers;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Calculate rank based on offset
  const startRank = cursor ? -1 : 1; // If paginating, rank is approximate
  const competitors: CompetitorResponse[] = results.map((l, idx) => ({
    id: l.id,
    rank: startRank === -1 ? 0 : startRank + idx,
    totalPoints: l.totalPoints,
    tier: l.tier,
    user: l.user
      ? {
          id: l.user.id,
          username: l.user.username,
          displayName: l.user.displayName,
          avatarUrl: l.user.avatarUrl,
          party: l.user.party ? { id: l.user.party.id, name: l.user.party.name } : undefined,
        }
      : undefined,
    party: l.party
      ? { id: l.party.id, name: l.party.name, handle: l.party.handle, avatarUrl: l.party.avatarUrl, memberCount: (l.party as any)._count?.memberships ?? 0 }
      : undefined,
  }));

  return { competitors, nextCursor };
};

// -----------------------------------------------------------------------------
// Get Scoreboard (ranked competitors with sparkline)
// -----------------------------------------------------------------------------

export const getScoreboard = async (
  raceId: string,
  period: string = 'all',
  cursor?: string,
  limit: number = 20,
  viewerId?: string
): Promise<{ entries: ScoreboardEntry[]; nextCursor: string | null }> => {
  const { competitors, nextCursor } = await getCompetitors(raceId, cursor, limit);

  // Fetch sparkline data for each competitor
  const dateFilter = getSparklineDateFilter(period);
  const ledgerIds = competitors.map((c) => c.id);

  const snapshots = ledgerIds.length > 0
    ? await prisma.pointSnapshot.findMany({
        where: {
          ledgerId: { in: ledgerIds },
          ...(dateFilter && { date: { gte: dateFilter } }),
        },
        orderBy: { date: 'asc' },
      })
    : [];

  // Group snapshots by ledger
  const snapshotMap = new Map<string, { date: string; points: number }[]>();
  for (const snap of snapshots) {
    const arr = snapshotMap.get(snap.ledgerId) ?? [];
    arr.push({ date: snap.date.toISOString().split('T')[0], points: snap.points });
    snapshotMap.set(snap.ledgerId, arr);
  }

  // Get viewer's favorites to determine isFavorited for each entry
  let favoritedUserIds = new Set<string>();
  if (viewerId) {
    const userIds = competitors.map((c) => c.user?.id).filter((id): id is string => !!id);
    if (userIds.length > 0) {
      const favorites = await prisma.favorite.findMany({
        where: {
          userId: viewerId,
          favoritedUserId: { in: userIds },
        },
        select: { favoritedUserId: true },
      });
      favoritedUserIds = new Set(favorites.map((f) => f.favoritedUserId));
    }
  }

  const entries: ScoreboardEntry[] = competitors.map((c) => {
    const sparkline = snapshotMap.get(c.id) ?? [];
    // Calculate change: difference between current points and first snapshot in period
    let change = 0;
    if (sparkline.length >= 2) {
      change = Math.round((sparkline[sparkline.length - 1].points - sparkline[0].points) * 100) / 100;
    }
    return {
      ...c,
      sparkline,
      change,
      isFavorited: viewerId && c.user?.id ? favoritedUserIds.has(c.user.id) : false,
    };
  });

  return { entries, nextCursor };
};

// -----------------------------------------------------------------------------
// Nominate Candidate
// -----------------------------------------------------------------------------

export const nominateCandidate = async (
  nominatorId: string,
  nomineeId: string,
  raceId: string,
  reelId: string
): Promise<NominationResponse> => {
  if (nominatorId === nomineeId) {
    throw new ForbiddenError('Cannot nominate yourself');
  }

  // Verify race exists
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  // Verify nominee exists (can be either PARTICIPANT or CANDIDATE)
  const nominee = await prisma.user.findUnique({
    where: { id: nomineeId },
    select: { id: true, username: true, displayName: true, avatarUrl: true, userType: true },
  });
  if (!nominee) throw new NotFoundError('Nominee');
  // Allow nominations for all users - PARTICIPANT users will get points saved as pending

  // Verify reel exists
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  try {
    const nomination = await prisma.nomination.create({
      data: { nominatorId, nomineeId, raceId, reelId },
      include: {
        nominator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        nominee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        race: {
          select: { id: true, title: true },
        },
      },
    });

    // Award NOMINATE points asynchronously
    recordPointEvent({
      targetUserId: nomineeId,
      raceId,
      action: 'NOMINATE',
      points: POINT_WEIGHTS.NOMINATE,
      sourceUserId: nominatorId,
      sourceReelId: reelId,
    }).catch(() => {});

    // Nomination notification - different message for PARTICIPANT vs CANDIDATE
    const nominator = await prisma.user.findUnique({
      where: { id: nominatorId },
      select: { username: true, avatarUrl: true },
    });

    const isParticipant = nominee.userType === 'PARTICIPANT';
    const notificationBody = isParticipant
      ? `${nominator?.username ?? 'Someone'} nominated you for ${race.title}! Opt-in as a candidate to claim your points.`
      : `${nominator?.username ?? 'Someone'} nominated you for ${race.title}`;

    createNotification({
      userId: nomineeId,
      type: 'NOMINATION',
      title: isParticipant ? 'You were nominated! 🎉' : 'You were nominated!',
      body: notificationBody,
      data: {
        raceId,
        nominatorId,
        reelId,
        actorUsername: nominator?.username,
        actorAvatarUrl: nominator?.avatarUrl,
        isParticipant,
      },
    }).catch(() => {});

    return {
      id: nomination.id,
      nominator: nomination.nominator,
      nominee: nomination.nominee,
      race: nomination.race,
      reelId: nomination.reelId,
      createdAt: nomination.createdAt,
    };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new ConflictError('You have already nominated this person for this race');
    }
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Get User Nominations Received
// -----------------------------------------------------------------------------

export const getUserNominations = async (
  userId: string
): Promise<NominationResponse[]> => {
  const nominations = await prisma.nomination.findMany({
    where: { nomineeId: userId },
    include: {
      nominator: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      nominee: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      race: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return nominations.map((n) => ({
    id: n.id,
    nominator: n.nominator,
    nominee: n.nominee,
    race: n.race,
    reelId: n.reelId,
    createdAt: n.createdAt,
  }));
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const getSparklineDateFilter = (period: string): Date | null => {
  const now = new Date();
  switch (period) {
    case 'today':
      // Include yesterday as baseline so sparklines have at least 2 points
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
    default:
      return null;
  }
};
