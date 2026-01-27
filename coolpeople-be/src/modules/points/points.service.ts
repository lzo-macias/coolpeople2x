/**
 * Points Service
 * Business logic for point recording, history, sparklines, and tier management
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { POINT_WEIGHTS, POINT_DECAY_WINDOW_DAYS, getTierFromPoints } from '../../config/constants.js';
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
// Handles race targeting logic: raceTargets on reel → those races, else CoolPeople
// -----------------------------------------------------------------------------

export const recordReelEngagementPoints = async (
  reelId: string,
  creatorId: string,
  sourceUserId: string,
  action: keyof typeof POINT_WEIGHTS
): Promise<void> => {
  if (creatorId === sourceUserId) return;

  const points = POINT_WEIGHTS[action];

  // Get race targets for this reel
  const raceTargets = await prisma.raceTarget.findMany({
    where: { reelId },
    select: { raceId: true },
  });

  let raceIds: string[];

  if (raceTargets.length > 0) {
    raceIds = raceTargets.map((t) => t.raceId);
  } else {
    // Default to CoolPeople system race
    const coolPeopleRace = await prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'CANDIDATE_VS_CANDIDATE' },
      select: { id: true },
    });
    if (!coolPeopleRace) return;
    raceIds = [coolPeopleRace.id];
  }

  // Award points in each targeted race
  await Promise.all(
    raceIds.map((raceId) =>
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

  // If reel has a party, also award to party in Best Party race
  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
    select: { partyId: true },
  });

  if (reel?.partyId) {
    const bestPartyRace = await prisma.race.findFirst({
      where: { isSystemRace: true, raceType: 'PARTY_VS_PARTY' },
      select: { id: true },
    });
    if (bestPartyRace) {
      recordPointEvent({
        targetPartyId: reel.partyId,
        raceId: bestPartyRace.id,
        action,
        points,
        sourceUserId,
        sourceReelId: reelId,
      }).catch(() => {});
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
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
