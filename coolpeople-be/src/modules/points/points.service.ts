/**
 * Points Service
 * Business logic for point recording, history, sparklines, and tier management
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { POINT_WEIGHTS, POINT_DECAY_WINDOW_DAYS, BASE_STARTER_POINTS, getTierFromPoints, POINT_ATTRIBUTION } from '../../config/constants.js';
import type { RecordPointEventParams, PointSummary, PointHistoryItem, SparklineDataPoint } from './points.types.js';

// -----------------------------------------------------------------------------
// Record Point Event
// Core function called by engagement hooks
// -----------------------------------------------------------------------------

export const recordPointEvent = async (params: RecordPointEventParams): Promise<void> => {
  const { targetUserId, targetPartyId, raceId, action, points, sourceUserId, sourceReelId } = params;

  // Prevent self-actions from earning points
  if (sourceUserId && targetUserId && sourceUserId === targetUserId) {
    return;
  }

  // Find or create ledger for the target in this race
  let ledger;

  if (targetUserId) {
    // Check if user is a PARTICIPANT - if so, save to pending points
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { userType: true },
    });

    if (user?.userType === 'PARTICIPANT') {
      // Save to pending points instead of actual ledger
      await prisma.pendingPoints.create({
        data: {
          userId: targetUserId,
          raceId,
          action: action as any,
          points,
          sourceUserId,
          sourceReelId,
        },
      });
      return; // Don't create actual ledger for participants
    }

    ledger = await prisma.pointLedger.findUnique({
      where: { userId_raceId: { userId: targetUserId, raceId } },
    });

    if (!ledger) {
      // Only create ledger if user is a competitor in this race
      const competitor = await prisma.raceCompetitor.findUnique({
        where: { raceId_userId: { raceId, userId: targetUserId } },
      });
      if (!competitor) return; // User is not competing in this race

      ledger = await prisma.pointLedger.create({
        data: { userId: targetUserId, raceId, totalPoints: 0, tier: 'BRONZE' },
      });
    }
  } else if (targetPartyId) {
    ledger = await prisma.pointLedger.findUnique({
      where: { partyId_raceId: { partyId: targetPartyId, raceId } },
    });

    if (!ledger) {
      const competitor = await prisma.raceCompetitor.findUnique({
        where: { raceId_partyId: { raceId, partyId: targetPartyId } },
      });
      if (!competitor) return;

      ledger = await prisma.pointLedger.create({
        data: { partyId: targetPartyId, raceId, totalPoints: 0, tier: 'BRONZE' },
      });
    }
  } else {
    return; // No target
  }

  const expiresAt = action !== 'DECAY'
    ? new Date(Date.now() + POINT_DECAY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    : null;

  // Create event and update ledger in transaction
  const newTotal = ledger.totalPoints + points;
  const newTier = getTierFromPoints(newTotal);

  await prisma.$transaction([
    prisma.pointEvent.create({
      data: {
        ledgerId: ledger.id,
        action: action as any,
        points,
        sourceUserId,
        sourceReelId,
        expiresAt,
      },
    }),
    prisma.pointLedger.update({
      where: { id: ledger.id },
      data: {
        totalPoints: { increment: points },
        tier: newTier,
      },
    }),
  ]);

  // Update today's snapshot immediately so sparklines reflect real-time changes
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.pointSnapshot.upsert({
      where: { ledgerId_date: { ledgerId: ledger.id, date: today } },
      create: {
        ledgerId: ledger.id,
        points: newTotal,
        tier: newTier,
        rank: 0,
        date: today,
      },
      update: {
        points: newTotal,
        tier: newTier,
      },
    });
  } catch {
    // Don't fail point recording on snapshot errors
  }

  // Emit real-time points update via WebSocket
  try {
    const io = getIO();
    if (io) {
      io.to(`race:${raceId}`).emit('points:update', {
        raceId,
        competitorId: targetUserId ?? targetPartyId,
        newPoints: newTotal,
        newTier,
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }
};

// -----------------------------------------------------------------------------
// Record Points for Reel Engagement
// Implements Hybrid Point Attribution:
// - Global races (CoolPeople/BestParty) always get 100%
// - Tagged races get 100%
// - Other active races get trickle (20% if tagged, 27% if untargeted)
// -----------------------------------------------------------------------------

export const recordReelEngagementPoints = async (
  reelId: string,
  creatorId: string,
  sourceUserId: string,
  action: keyof typeof POINT_WEIGHTS
): Promise<void> => {
  if (creatorId === sourceUserId) return;

  const basePoints = POINT_WEIGHTS[action];

  // Get race targets for this reel (explicit tags via race pill)
  const raceTargets = await prisma.raceTarget.findMany({
    where: { reelId },
    select: { raceId: true },
  });
  const taggedRaceIds = new Set(raceTargets.map((t) => t.raceId));

  // Get global system races
  const [coolPeopleRace, bestPartyRace] = await Promise.all([
    prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'CANDIDATE_VS_CANDIDATE' },
      select: { id: true },
    }),
    prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
      select: { id: true },
    }),
  ]);

  // Get all races the creator is actively competing in
  const activeCompetitions = await prisma.raceCompetitor.findMany({
    where: { userId: creatorId },
    select: { raceId: true },
  });
  const activeRaceIds = new Set(activeCompetitions.map((c) => c.raceId));

  const isTaggedPost = taggedRaceIds.size > 0;

  // Build point awards: { raceId: pointsToAward }
  const pointAwards: Map<string, number> = new Map();

  // 1. Global race (CoolPeople) ALWAYS gets 100%
  if (coolPeopleRace) {
    pointAwards.set(coolPeopleRace.id, basePoints);
  }

  if (isTaggedPost) {
    // 2a. Tagged races get 100%
    for (const raceId of taggedRaceIds) {
      // Don't double-award if it's the global race
      if (raceId !== coolPeopleRace?.id) {
        pointAwards.set(raceId, basePoints);
      }
    }

    // 2b. Other active races get trickle (20%)
    for (const raceId of activeRaceIds) {
      if (!taggedRaceIds.has(raceId) && raceId !== coolPeopleRace?.id) {
        const tricklePoints = Math.round(basePoints * POINT_ATTRIBUTION.OTHER_ACTIVE_RACE_TRICKLE * 100) / 100;
        if (tricklePoints > 0) {
          pointAwards.set(raceId, tricklePoints);
        }
      }
    }
  } else {
    // 3. Untargeted post: each active race gets 27% trickle
    for (const raceId of activeRaceIds) {
      if (raceId !== coolPeopleRace?.id) {
        const tricklePoints = Math.round(basePoints * POINT_ATTRIBUTION.UNTARGETED_TO_ACTIVE_RACE * 100) / 100;
        if (tricklePoints > 0) {
          pointAwards.set(raceId, tricklePoints);
        }
      }
    }
  }

  // Award points in all applicable races
  await Promise.all(
    Array.from(pointAwards.entries()).map(([raceId, points]) =>
      recordPointEvent({
        targetUserId: creatorId,
        raceId,
        action,
        points,
        sourceUserId,
        sourceReelId: reelId,
      }).catch(() => {}) // Don't fail engagement on point errors
    )
  );

  // Handle party points separately (Best Party race)
  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
    select: { partyId: true },
  });

  if (reel?.partyId && bestPartyRace) {
    // Party always gets 100% in Best Party race
    recordPointEvent({
      targetPartyId: reel.partyId,
      raceId: bestPartyRace.id,
      action,
      points: basePoints,
      sourceUserId,
      sourceReelId: reelId,
    }).catch(() => {});

    // If party is competing in other PARTY_VS_PARTY races, trickle to those
    const partyCompetitions = await prisma.raceCompetitor.findMany({
      where: { partyId: reel.partyId },
      select: { raceId: true },
    });

    const partyActiveRaceIds = partyCompetitions.map((c) => c.raceId);
    const trickleRate = isTaggedPost
      ? POINT_ATTRIBUTION.OTHER_ACTIVE_RACE_TRICKLE
      : POINT_ATTRIBUTION.UNTARGETED_TO_ACTIVE_RACE;

    for (const raceId of partyActiveRaceIds) {
      if (raceId !== bestPartyRace.id) {
        const tricklePoints = Math.round(basePoints * trickleRate * 100) / 100;
        if (tricklePoints > 0) {
          recordPointEvent({
            targetPartyId: reel.partyId,
            raceId,
            action,
            points: tricklePoints,
            sourceUserId,
            sourceReelId: reelId,
          }).catch(() => {});
        }
      }
    }
  }
};

// -----------------------------------------------------------------------------
// Get User Point Summary (all ledgers)
// -----------------------------------------------------------------------------

export const getUserPointSummary = async (userId: string): Promise<PointSummary[]> => {
  const ledgers = await prisma.pointLedger.findMany({
    where: { userId },
    include: {
      race: { select: { id: true, title: true } },
    },
    orderBy: { totalPoints: 'desc' },
  });

  return ledgers.map((l) => ({
    ledgerId: l.id,
    totalPoints: l.totalPoints,
    tier: l.tier,
    raceId: l.race.id,
    raceName: l.race.title,
  }));
};

// -----------------------------------------------------------------------------
// Get Point History
// -----------------------------------------------------------------------------

export const getPointHistory = async (
  userId: string,
  raceId?: string,
  period: string = '30d',
  cursor?: string,
  limit: number = 20
): Promise<{ events: PointHistoryItem[]; nextCursor: string | null }> => {
  // Build date filter
  const dateFilter = getPeriodDateFilter(period);

  // Find ledger IDs for this user
  const ledgerWhere: any = { userId };
  if (raceId) ledgerWhere.raceId = raceId;

  const ledgers = await prisma.pointLedger.findMany({
    where: ledgerWhere,
    select: { id: true },
  });

  if (ledgers.length === 0) {
    return { events: [], nextCursor: null };
  }

  const ledgerIds = ledgers.map((l) => l.id);

  const events = await prisma.pointEvent.findMany({
    where: {
      ledgerId: { in: ledgerIds },
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = events.length > limit;
  const results = hasMore ? events.slice(0, -1) : events;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    events: results.map((e) => ({
      id: e.id,
      action: e.action,
      points: e.points,
      sourceUserId: e.sourceUserId,
      sourceReelId: e.sourceReelId,
      createdAt: e.createdAt,
    })),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Get Sparkline Data
// -----------------------------------------------------------------------------

export const getSparklineData = async (
  ledgerId: string,
  period: string = '30d'
): Promise<SparklineDataPoint[]> => {
  const ledger = await prisma.pointLedger.findUnique({
    where: { id: ledgerId },
  });

  if (!ledger) {
    throw new NotFoundError('Point ledger');
  }

  const dateFilter = getPeriodDateFilter(period);

  const snapshots = await prisma.pointSnapshot.findMany({
    where: {
      ledgerId,
      ...(dateFilter && { date: { gte: dateFilter } }),
    },
    orderBy: { date: 'asc' },
  });

  return snapshots.map((s) => ({
    date: s.date.toISOString().split('T')[0],
    points: s.points,
    tier: s.tier,
    rank: s.rank,
  }));
};

// -----------------------------------------------------------------------------
// Recalculate Ledger Total
// Used by decay job after expiring events
// -----------------------------------------------------------------------------

export const recalculateLedgerTotal = async (ledgerId: string): Promise<void> => {
  const result = await prisma.pointEvent.aggregate({
    where: { ledgerId, isExpired: false },
    _sum: { points: true },
  });

  const totalPoints = result._sum?.points ?? 0;
  const tier = getTierFromPoints(totalPoints);

  await prisma.pointLedger.update({
    where: { id: ledgerId },
    data: { totalPoints, tier },
  });
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const getPeriodDateFilter = (period: string): Date | null => {
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
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

// -----------------------------------------------------------------------------
// Transfer Pending Points
// Called when a PARTICIPANT opts-in to become a CANDIDATE
// -----------------------------------------------------------------------------

export const transferPendingPoints = async (userId: string): Promise<{ transferred: number; totalPoints: number }> => {
  // Get all pending points for this user
  const pendingPoints = await prisma.pendingPoints.findMany({
    where: { userId },
  });

  if (pendingPoints.length === 0) {
    return { transferred: 0, totalPoints: 0 };
  }

  let totalPointsTransferred = 0;

  // Transfer each pending point event
  for (const pending of pendingPoints) {
    try {
      // Now that user is a CANDIDATE, record the point event normally
      // First ensure they're a competitor in the race (join CoolPeople by default)
      const existingCompetitor = await prisma.raceCompetitor.findUnique({
        where: { raceId_userId: { raceId: pending.raceId, userId } },
      });

      if (!existingCompetitor) {
        // Auto-join the race as a competitor
        await prisma.raceCompetitor.create({
          data: { raceId: pending.raceId, userId },
        });
      }

      // Find or create ledger
      let ledger = await prisma.pointLedger.findUnique({
        where: { userId_raceId: { userId, raceId: pending.raceId } },
      });

      if (!ledger) {
        ledger = await prisma.pointLedger.create({
          data: { userId, raceId: pending.raceId, totalPoints: 0, tier: 'BRONZE' },
        });
      }

      const expiresAt = new Date(Date.now() + POINT_DECAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      // Create point event and update ledger
      const newTotal = ledger.totalPoints + pending.points;
      const newTier = getTierFromPoints(newTotal);

      await prisma.$transaction([
        prisma.pointEvent.create({
          data: {
            ledgerId: ledger.id,
            action: pending.action,
            points: pending.points,
            sourceUserId: pending.sourceUserId,
            sourceReelId: pending.sourceReelId,
            expiresAt,
          },
        }),
        prisma.pointLedger.update({
          where: { id: ledger.id },
          data: {
            totalPoints: { increment: pending.points },
            tier: newTier,
          },
        }),
        // Delete the pending point record
        prisma.pendingPoints.delete({
          where: { id: pending.id },
        }),
      ]);

      totalPointsTransferred += pending.points;
    } catch (error) {
      console.error(`Failed to transfer pending point ${pending.id}:`, error);
    }
  }

  return { transferred: pendingPoints.length, totalPoints: totalPointsTransferred };
};

// -----------------------------------------------------------------------------
// Get Pending Points Summary
// For displaying to PARTICIPANT users how many points they'll get on opt-in
// -----------------------------------------------------------------------------

export const getPendingPointsSummary = async (userId: string): Promise<{ totalPending: number; byRace: { raceId: string; raceName: string; points: number }[] }> => {
  const pending = await prisma.pendingPoints.groupBy({
    by: ['raceId'],
    where: { userId },
    _sum: { points: true },
  });

  if (pending.length === 0) {
    return { totalPending: 0, byRace: [] };
  }

  // Get race names
  const raceIds = pending.map((p) => p.raceId);
  const races = await prisma.race.findMany({
    where: { id: { in: raceIds } },
    select: { id: true, title: true },
  });

  const raceMap = new Map(races.map((r) => [r.id, r.title]));

  const byRace = pending.map((p) => ({
    raceId: p.raceId,
    raceName: raceMap.get(p.raceId) || 'Unknown Race',
    points: p._sum.points || 0,
  }));

  const totalPending = byRace.reduce((sum, r) => sum + r.points, 0);

  return { totalPending, byRace };
};

// -----------------------------------------------------------------------------
// Seed Initial Sparkline
// Called when a user/party first enters the points system to generate
// backdated PointSnapshot records so they have a visible sparkline from day one.
// Also adds BASE_STARTER_POINTS if the ledger has fewer points than the base.
// -----------------------------------------------------------------------------

export const seedInitialSparkline = async (ledgerId: string): Promise<void> => {
  const ledger = await prisma.pointLedger.findUnique({
    where: { id: ledgerId },
  });

  if (!ledger) return;

  // Ensure minimum starter points
  let totalPoints = ledger.totalPoints;
  if (totalPoints < BASE_STARTER_POINTS) {
    totalPoints = BASE_STARTER_POINTS;
    await prisma.pointLedger.update({
      where: { id: ledgerId },
      data: {
        totalPoints,
        tier: getTierFromPoints(totalPoints),
      },
    });
  }

  // Seed 90 days of flat snapshots at the current total so every period
  // selector (1D, 1W, 1M, 3M, ALL) has data. The line stays flat until
  // real actions move the points up or down.
  const totalDays = 90;
  const tier = getTierFromPoints(totalPoints);

  for (let i = 0; i < totalDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - i));
    date.setHours(0, 0, 0, 0);

    await prisma.pointSnapshot.upsert({
      where: { ledgerId_date: { ledgerId, date } },
      create: {
        ledgerId,
        points: totalPoints,
        tier,
        rank: 0,
        date,
      },
      update: {
        points: totalPoints,
        tier,
      },
    });
  }
};
