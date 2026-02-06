/**
 * Races Service
 * Business logic for race CRUD, follow, compete, nominate, and scoreboard
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { POINT_WEIGHTS, POINT_ATTRIBUTION } from '../../config/constants.js';
import { getTierFromPoints } from '../../config/constants.js';
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

const formatRace = (race: any, viewerId?: string, viewerPartyId?: string): RaceResponse => ({
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
    ? race.raceType === 'PARTY_VS_PARTY'
      ? race.competitors?.some((c: any) => c.partyId === viewerPartyId)
      : race.competitors?.some((c: any) => c.userId === viewerId)
    : undefined,
  createdAt: race.createdAt,
});

const raceIncludes = (viewerId?: string, viewerPartyId?: string) => ({
  _count: {
    select: { competitors: true, followers: true },
  },
  ...(viewerId && {
    followers: { where: { userId: viewerId }, take: 1 },
    competitors: viewerPartyId
      ? { where: { OR: [{ userId: viewerId }, { partyId: viewerPartyId }] }, take: 1 }
      : { where: { userId: viewerId }, take: 1 },
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
  // Get viewer's party ID for party race competition checks
  let viewerPartyId: string | undefined;
  if (viewerId) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { partyId: true },
    });
    viewerPartyId = viewer?.partyId || undefined;
  }

  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: raceIncludes(viewerId, viewerPartyId),
  });

  if (!race) {
    throw new NotFoundError('Race');
  }

  return formatRace(race, viewerId, viewerPartyId);
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

  // Get viewer's party ID for party race competition checks
  let viewerPartyId: string | undefined;
  if (viewerId) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { partyId: true },
    });
    viewerPartyId = viewer?.partyId || undefined;
  }

  const races = await prisma.race.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: raceIncludes(viewerId, viewerPartyId),
  });

  const hasMore = races.length > limit;
  const results = hasMore ? races.slice(0, -1) : races;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    races: results.map((r) => formatRace(r, viewerId, viewerPartyId)),
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

  // Calculate baseline points from global race (CoolPeople)
  // New competitors start with 25-30% of their global race points
  let baselinePoints = 0;
  if (!race.isSystemRace) {
    // Find CoolPeople system race
    const globalRace = await prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'CANDIDATE_VS_CANDIDATE' },
      select: { id: true },
    });

    if (globalRace) {
      // Get user's points in CoolPeople race
      const globalLedger = await prisma.pointLedger.findUnique({
        where: { userId_raceId: { userId, raceId: globalRace.id } },
        select: { totalPoints: true },
      });

      if (globalLedger && globalLedger.totalPoints > 0) {
        baselinePoints = Math.round(globalLedger.totalPoints * POINT_ATTRIBUTION.BASELINE_FROM_GLOBAL);
      }
    }
  }

  const tier = getTierFromPoints(baselinePoints);

  try {
    await prisma.$transaction([
      prisma.raceCompetitor.create({ data: { raceId, userId } }),
      // Create point ledger for this race with baseline points
      prisma.pointLedger.create({
        data: { userId, raceId, totalPoints: baselinePoints, tier },
      }),
    ]);

    // If there are baseline points, seed the sparkline so it shows from day one
    if (baselinePoints > 0) {
      const ledger = await prisma.pointLedger.findUnique({
        where: { userId_raceId: { userId, raceId } },
      });
      if (ledger) {
        const { seedInitialSparkline } = await import('../points/points.service.js');
        await seedInitialSparkline(ledger.id);
      }
    }
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
// Enter Party into Race
// -----------------------------------------------------------------------------

export const enterPartyInRace = async (
  userId: string,
  partyId: string,
  raceId: string
): Promise<{ competing: boolean }> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  // Only party races allow party competitors
  if (race.raceType !== 'PARTY_VS_PARTY') {
    throw new ForbiddenError('This race is for individual candidates, not parties');
  }

  // Check user has permission on the party (leader or admin)
  const membership = await prisma.partyMembership.findUnique({
    where: { userId_partyId: { userId, partyId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this party');
  }

  if (!membership.permissions.includes('leader') && !membership.permissions.includes('admin')) {
    throw new ForbiddenError('Only party leaders and admins can enter the party into races');
  }

  // Calculate baseline points from global party race (Best Party)
  let baselinePoints = 0;
  if (!race.isSystemRace) {
    const globalPartyRace = await prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
      select: { id: true },
    });

    if (globalPartyRace) {
      const globalLedger = await prisma.pointLedger.findUnique({
        where: { partyId_raceId: { partyId, raceId: globalPartyRace.id } },
        select: { totalPoints: true },
      });

      if (globalLedger && globalLedger.totalPoints > 0) {
        baselinePoints = Math.round(globalLedger.totalPoints * POINT_ATTRIBUTION.BASELINE_FROM_GLOBAL);
      }
    }
  }

  const tier = getTierFromPoints(baselinePoints);

  try {
    await prisma.$transaction([
      prisma.raceCompetitor.create({ data: { raceId, partyId } }),
      prisma.pointLedger.create({
        data: { partyId, raceId, totalPoints: baselinePoints, tier },
      }),
    ]);

    // Seed sparkline if there are baseline points
    if (baselinePoints > 0) {
      const ledger = await prisma.pointLedger.findUnique({
        where: { partyId_raceId: { partyId, raceId } },
      });
      if (ledger) {
        const { seedInitialSparkline } = await import('../points/points.service.js');
        await seedInitialSparkline(ledger.id);
      }
    }

    return { competing: true };
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Party is already competing in this race');
    throw err;
  }
};

// Check if user can enter a party into a race
export const canEnterPartyInRace = async (
  userId: string,
  partyId: string
): Promise<boolean> => {
  const membership = await prisma.partyMembership.findUnique({
    where: { userId_partyId: { userId, partyId } },
  });

  if (!membership) return false;

  return membership.permissions.includes('leader') || membership.permissions.includes('admin');
};

// -----------------------------------------------------------------------------
// Remove User from All Races (when userType changes to PARTICIPANT)
// -----------------------------------------------------------------------------

export const removeUserFromAllRaces = async (userId: string): Promise<void> => {
  // Delete all race competitor entries for this user
  // This removes them from scoreboards but preserves their point ledgers
  await prisma.raceCompetitor.deleteMany({ where: { userId } });

  // NOTE: We intentionally do NOT delete pointLedgers here.
  // Per spec: "Reverting to Participant: Points are frozen (decay still active)"
  // Points are preserved so if the user becomes a candidate again, they keep their points
  // (minus any decay that occurred while they were a participant).

  console.log(`Removed user ${userId} from all races (points preserved)`);
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

  // Query RaceCompetitor as source of truth for enrollment
  // For CANDIDATE_VS_CANDIDATE races, filter by user
  // For PARTY_VS_PARTY races, filter by party
  const whereClause: any = { raceId };
  if (race.raceType === 'CANDIDATE_VS_CANDIDATE') {
    whereClause.userId = { not: null };
  } else if (race.raceType === 'PARTY_VS_PARTY') {
    whereClause.partyId = { not: null };
  }

  // Get enrolled competitors from RaceCompetitor
  const raceCompetitors = await prisma.raceCompetitor.findMany({
    where: whereClause,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { enrolledAt: 'asc' },
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

  const hasMore = raceCompetitors.length > limit;
  const results = hasMore ? raceCompetitors.slice(0, -1) : raceCompetitors;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Get PointLedger data for these competitors to get their points
  const userIds = results.map(c => c.userId).filter((id): id is string => !!id);
  const partyIds = results.map(c => c.partyId).filter((id): id is string => !!id);

  // Build OR conditions for ledger lookup
  const orConditions: any[] = [];
  if (userIds.length > 0) orConditions.push({ userId: { in: userIds } });
  if (partyIds.length > 0) orConditions.push({ partyId: { in: partyIds } });

  const ledgers = orConditions.length > 0
    ? await prisma.pointLedger.findMany({
        where: {
          raceId,
          OR: orConditions,
        },
      })
    : [];

  // Create lookup map for points
  const ledgerMap = new Map<string, { id: string; totalPoints: number; tier: string }>();
  for (const l of ledgers) {
    const key = l.userId ?? l.partyId;
    if (key) {
      ledgerMap.set(key, { id: l.id, totalPoints: l.totalPoints, tier: l.tier });
    }
  }

  // Build competitors array with points, sorted by points descending
  const competitorsWithPoints = results.map((c) => {
    const entityId = c.userId ?? c.partyId;
    const ledgerData = entityId ? ledgerMap.get(entityId) : null;
    return {
      ...c,
      ledgerId: ledgerData?.id ?? c.id,
      totalPoints: ledgerData?.totalPoints ?? 0,
      tier: (ledgerData?.tier ?? 'BRONZE') as any,
    };
  });

  // Sort by totalPoints descending
  competitorsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);

  // Calculate rank based on offset
  const startRank = cursor ? -1 : 1; // If paginating, rank is approximate
  const competitors: CompetitorResponse[] = competitorsWithPoints.map((c, idx) => ({
    id: c.ledgerId,
    rank: startRank === -1 ? 0 : startRank + idx,
    totalPoints: c.totalPoints,
    tier: c.tier,
    user: c.user
      ? {
          id: c.user.id,
          username: c.user.username,
          displayName: c.user.displayName,
          avatarUrl: c.user.avatarUrl,
          party: c.user.party ? { id: c.user.party.id, name: c.user.party.name } : undefined,
        }
      : undefined,
    party: c.party
      ? { id: c.party.id, name: c.party.name, handle: c.party.handle, avatarUrl: c.party.avatarUrl, memberCount: (c.party as any)._count?.memberships ?? 0 }
      : undefined,
  }));

  return { competitors, nextCursor };
};

// -----------------------------------------------------------------------------
// Get Scoreboard (ranked competitors with sparkline)
// -----------------------------------------------------------------------------

export const getScoreboard = async (
  raceId: string,
  period: string = '7d',
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
  let followedPartyIds = new Set<string>();
  if (viewerId) {
    // Check user favorites
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

    // Check party follows
    const partyIds = competitors.map((c) => c.party?.id).filter((id): id is string => !!id);
    if (partyIds.length > 0) {
      const follows = await prisma.partyFollow.findMany({
        where: {
          userId: viewerId,
          partyId: { in: partyIds },
        },
        select: { partyId: true },
      });
      followedPartyIds = new Set(follows.map((f) => f.partyId));
    }
  }

  const entries: ScoreboardEntry[] = competitors.map((c) => {
    const sparkline = snapshotMap.get(c.id) ?? [];
    // Calculate change: difference between current points and first snapshot in period
    let change = 0;
    if (sparkline.length >= 2) {
      change = Math.round((sparkline[sparkline.length - 1].points - sparkline[0].points) * 100) / 100;
    }
    // Set isFavorited based on user favorites or party follows
    const isFavorited = viewerId
      ? (c.user?.id ? favoritedUserIds.has(c.user.id) : false) ||
        (c.party?.id ? followedPartyIds.has(c.party.id) : false)
      : false;
    return {
      ...c,
      sparkline,
      change,
      isFavorited,
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

// -----------------------------------------------------------------------------
// Boost Competitor (direct points without reel context)
// One boost per user per target per race (permanent, can be toggled)
// -----------------------------------------------------------------------------

export const boostCompetitor = async (
  boosterId: string,
  raceId: string,
  targetUserId?: string,
  targetPartyId?: string
): Promise<{ success: boolean; newPoints: number; boosted: boolean }> => {
  // Verify race exists
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  // Prevent self-boost for users
  if (targetUserId && boosterId === targetUserId) {
    throw new ForbiddenError('Cannot boost yourself');
  }

  if (!targetUserId && !targetPartyId) {
    throw new ForbiddenError('Must specify either targetUserId or targetPartyId');
  }

  // Check for existing boost (one per user per target per race - permanent)
  const existingBoost = await prisma.raceBoost.findFirst({
    where: {
      boosterId,
      raceId,
      ...(targetUserId ? { targetUserId } : { targetPartyId }),
    },
  });

  let newPoints = 0;
  let boosted = false;

  if (existingBoost) {
    // Already boosted - remove the boost (un-nominate)
    await prisma.raceBoost.delete({ where: { id: existingBoost.id } });

    // Deduct points
    await recordPointEvent({
      targetUserId,
      targetPartyId,
      raceId,
      action: 'NOMINATE',
      points: -POINT_WEIGHTS.NOMINATE, // Negative to deduct
      sourceUserId: boosterId,
    });

    boosted = false;
  } else {
    // Not boosted yet - create boost
    await prisma.raceBoost.create({
      data: {
        boosterId,
        raceId,
        targetUserId,
        targetPartyId,
      },
    });

    // Award points
    await recordPointEvent({
      targetUserId,
      targetPartyId,
      raceId,
      action: 'NOMINATE',
      points: POINT_WEIGHTS.NOMINATE,
      sourceUserId: boosterId,
    });

    boosted = true;

    // Send notification (only for user targets, only on boost not unboost)
    if (targetUserId) {
      const booster = await prisma.user.findUnique({
        where: { id: boosterId },
        select: { username: true, avatarUrl: true },
      });

      createNotification({
        userId: targetUserId,
        type: 'NOMINATION',
        title: 'Someone nominated you!',
        body: `${booster?.username ?? 'Someone'} nominated you in ${race.title}`,
        data: {
          raceId,
          boosterId,
          actorUsername: booster?.username,
          actorAvatarUrl: booster?.avatarUrl,
        },
      }).catch(() => {});
    }
  }

  // Get updated points
  if (targetUserId) {
    const ledger = await prisma.pointLedger.findUnique({
      where: { userId_raceId: { userId: targetUserId, raceId } },
    });
    newPoints = ledger?.totalPoints ?? 0;
  } else if (targetPartyId) {
    const ledger = await prisma.pointLedger.findUnique({
      where: { partyId_raceId: { partyId: targetPartyId, raceId } },
    });
    newPoints = ledger?.totalPoints ?? 0;
  }

  return { success: true, newPoints, boosted };
};

// -----------------------------------------------------------------------------
// Get Boost Status - Check what the user has boosted in a race
// -----------------------------------------------------------------------------

export const getBoostStatus = async (
  userId: string,
  raceId: string
): Promise<{ boostedUserIds: string[]; boostedPartyIds: string[] }> => {
  const boosts = await prisma.raceBoost.findMany({
    where: { boosterId: userId, raceId },
    select: { targetUserId: true, targetPartyId: true },
  });

  return {
    boostedUserIds: boosts.filter(b => b.targetUserId).map(b => b.targetUserId!),
    boostedPartyIds: boosts.filter(b => b.targetPartyId).map(b => b.targetPartyId!),
  };
};
