/**
 * Ballot Service
 * Business logic for ballot submission, processing, and results
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { runSTV } from '../../lib/stv.js';
import type { STVCandidate, STVBallot } from '../../lib/stv.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface BallotRanking {
  competitorId: string;
  rank: number;
}

interface BallotStatusResponse {
  raceId: string;
  ballotOpensAt: Date | null;
  ballotClosesAt: Date | null;
  ballotProcessed: boolean;
  isOpen: boolean;
  hasVoted: boolean;
  userBallot?: {
    id: string;
    rankings: { competitorId: string; rank: number }[];
  };
  competitors: {
    id: string;
    userId: string | null;
    partyId: string | null;
    name: string;
  }[];
}

interface BallotResultsResponse {
  raceId: string;
  processed: boolean;
  placements: {
    rank: number;
    competitorId: string;
    name: string;
    pointsAwarded: number;
  }[];
  totalVotes: number;
}

// Point awards by rank
const BALLOT_POINTS: Record<number, { action: string; points: number }> = {
  1: { action: 'BALLOT_RANK_1', points: POINT_WEIGHTS.BALLOT_RANK_1 },
  2: { action: 'BALLOT_RANK_2', points: POINT_WEIGHTS.BALLOT_RANK_2 },
  3: { action: 'BALLOT_RANK_3', points: POINT_WEIGHTS.BALLOT_RANK_3 },
};

// -----------------------------------------------------------------------------
// Get Ballot Status
// -----------------------------------------------------------------------------

export const getBallotStatus = async (
  raceId: string,
  userId: string
): Promise<BallotStatusResponse> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.winCondition !== 'BALLOT') {
    throw new ForbiddenError('This race does not use ballot voting');
  }

  const now = new Date();
  const isOpen =
    !!race.ballotOpensAt &&
    !!race.ballotClosesAt &&
    now >= race.ballotOpensAt &&
    now <= race.ballotClosesAt;

  // Check if user has voted
  const existingBallot = await prisma.ballot.findUnique({
    where: { raceId_voterId: { raceId, voterId: userId } },
    include: {
      rankings: {
        orderBy: { rank: 'asc' },
        select: { competitorId: true, rank: true },
      },
    },
  });

  // Get competitors
  const competitors = await prisma.raceCompetitor.findMany({
    where: { raceId },
    include: {
      user: { select: { id: true, displayName: true } },
      party: { select: { id: true, name: true } },
    },
  });

  return {
    raceId,
    ballotOpensAt: race.ballotOpensAt,
    ballotClosesAt: race.ballotClosesAt,
    ballotProcessed: race.ballotProcessed,
    isOpen,
    hasVoted: !!existingBallot,
    userBallot: existingBallot
      ? {
          id: existingBallot.id,
          rankings: existingBallot.rankings,
        }
      : undefined,
    competitors: competitors.map((c) => ({
      id: c.id,
      userId: c.userId,
      partyId: c.partyId,
      name: c.user?.displayName ?? c.party?.name ?? 'Unknown',
    })),
  };
};

// -----------------------------------------------------------------------------
// Submit Ballot
// -----------------------------------------------------------------------------

export const submitBallot = async (
  raceId: string,
  userId: string,
  rankings: BallotRanking[]
): Promise<{ ballotId: string }> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.winCondition !== 'BALLOT') {
    throw new ForbiddenError('This race does not use ballot voting');
  }

  // Check ballot is open
  const now = new Date();
  if (!race.ballotOpensAt || !race.ballotClosesAt || now < race.ballotOpensAt || now > race.ballotClosesAt) {
    throw new ForbiddenError('Ballot is not currently open');
  }

  if (race.ballotProcessed) {
    throw new ForbiddenError('Ballot has already been processed');
  }

  // Check user follows the race
  const raceFollow = await prisma.raceFollow.findUnique({
    where: { userId_raceId: { userId, raceId } },
  });
  if (!raceFollow) {
    throw new ForbiddenError('You must follow this race to vote');
  }

  // Check no existing ballot
  const existingBallot = await prisma.ballot.findUnique({
    where: { raceId_voterId: { raceId, voterId: userId } },
  });
  if (existingBallot) {
    throw new ForbiddenError('You have already submitted a ballot. Use PATCH to update.');
  }

  // Validate rankings reference actual competitors
  const competitorIds = new Set(
    (await prisma.raceCompetitor.findMany({
      where: { raceId },
      select: { id: true },
    })).map((c) => c.id)
  );

  for (const r of rankings) {
    if (!competitorIds.has(r.competitorId)) {
      throw new ValidationError(`Competitor ${r.competitorId} is not in this race`);
    }
  }

  // Check for duplicate ranks
  const ranks = rankings.map((r) => r.rank);
  if (new Set(ranks).size !== ranks.length) {
    throw new ValidationError('Duplicate ranks are not allowed');
  }

  // Create ballot with rankings
  const ballot = await prisma.ballot.create({
    data: {
      raceId,
      voterId: userId,
      rankings: {
        create: rankings.map((r) => ({
          competitorId: r.competitorId,
          rank: r.rank,
        })),
      },
    },
  });

  return { ballotId: ballot.id };
};

// -----------------------------------------------------------------------------
// Update Ballot (before deadline)
// -----------------------------------------------------------------------------

export const updateBallot = async (
  raceId: string,
  userId: string,
  rankings: BallotRanking[]
): Promise<{ ballotId: string }> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.winCondition !== 'BALLOT') {
    throw new ForbiddenError('This race does not use ballot voting');
  }

  const now = new Date();
  if (!race.ballotOpensAt || !race.ballotClosesAt || now < race.ballotOpensAt || now > race.ballotClosesAt) {
    throw new ForbiddenError('Ballot is not currently open');
  }

  if (race.ballotProcessed) {
    throw new ForbiddenError('Ballot has already been processed');
  }

  const existingBallot = await prisma.ballot.findUnique({
    where: { raceId_voterId: { raceId, voterId: userId } },
  });
  if (!existingBallot) {
    throw new NotFoundError('Ballot');
  }

  // Validate rankings
  const competitorIds = new Set(
    (await prisma.raceCompetitor.findMany({
      where: { raceId },
      select: { id: true },
    })).map((c) => c.id)
  );

  for (const r of rankings) {
    if (!competitorIds.has(r.competitorId)) {
      throw new ValidationError(`Competitor ${r.competitorId} is not in this race`);
    }
  }

  const ranks = rankings.map((r) => r.rank);
  if (new Set(ranks).size !== ranks.length) {
    throw new ValidationError('Duplicate ranks are not allowed');
  }

  // Delete old rankings and create new ones
  await prisma.$transaction([
    prisma.ballotRanking.deleteMany({ where: { ballotId: existingBallot.id } }),
    ...rankings.map((r) =>
      prisma.ballotRanking.create({
        data: {
          ballotId: existingBallot.id,
          competitorId: r.competitorId,
          rank: r.rank,
        },
      })
    ),
  ]);

  return { ballotId: existingBallot.id };
};

// -----------------------------------------------------------------------------
// Process Ballot (run STV, award points)
// -----------------------------------------------------------------------------

export const processBallot = async (raceId: string): Promise<void> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (race.ballotProcessed) return; // Already processed

  // Get all competitors with their point totals (for tiebreaking)
  const competitors = await prisma.raceCompetitor.findMany({
    where: { raceId },
    include: {
      user: { select: { id: true, displayName: true } },
      party: { select: { id: true, name: true } },
    },
  });

  const pointLedgers = await prisma.pointLedger.findMany({
    where: { raceId },
  });
  const pointMap = new Map(
    pointLedgers.map((l) => [l.userId ?? l.partyId, l.totalPoints])
  );

  const stvCandidates: STVCandidate[] = competitors.map((c) => ({
    id: c.id,
    name: c.user?.displayName ?? c.party?.name ?? 'Unknown',
    tiebreakPoints: pointMap.get(c.userId ?? c.partyId ?? '') ?? 0,
  }));

  // Get all ballots
  const ballots = await prisma.ballot.findMany({
    where: { raceId },
    include: {
      rankings: { orderBy: { rank: 'asc' } },
    },
  });

  const stvBallots: STVBallot[] = ballots.map((b) => ({
    rankings: b.rankings.map((r) => r.competitorId),
  }));

  // Run STV
  const result = runSTV(stvCandidates, stvBallots, 3);

  // Award points to top 3
  for (const placement of result.placements) {
    const pointConfig = BALLOT_POINTS[placement.rank];
    if (!pointConfig) continue;

    const competitor = competitors.find((c) => c.id === placement.candidateId);
    if (!competitor) continue;

    await recordPointEvent({
      targetUserId: competitor.userId ?? undefined,
      targetPartyId: competitor.partyId ?? undefined,
      raceId,
      action: pointConfig.action,
      points: pointConfig.points,
    }).catch(() => {});
  }

  // Mark ballot as processed
  await prisma.race.update({
    where: { id: raceId },
    data: { ballotProcessed: true },
  });

  // Notify race followers
  const followers = await prisma.raceFollow.findMany({
    where: { raceId },
    select: { userId: true },
  });

  const topNames = result.placements
    .slice(0, 3)
    .map((p) => {
      const c = competitors.find((c) => c.id === p.candidateId);
      return c?.user?.displayName ?? c?.party?.name ?? 'Unknown';
    })
    .join(', ');

  for (const follower of followers) {
    createNotification({
      userId: follower.userId,
      type: 'RACE_UPDATE',
      title: `${race.title} ballot results are in!`,
      body: `Top placements: ${topNames}`,
      data: { raceId, placements: result.placements },
    }).catch(() => {});
  }
};

// -----------------------------------------------------------------------------
// Get Ballot Results
// -----------------------------------------------------------------------------

export const getBallotResults = async (
  raceId: string
): Promise<BallotResultsResponse> => {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new NotFoundError('Race');

  if (!race.ballotProcessed) {
    throw new ForbiddenError('Ballot results are not yet available');
  }

  const competitors = await prisma.raceCompetitor.findMany({
    where: { raceId },
    include: {
      user: { select: { displayName: true } },
      party: { select: { name: true } },
    },
  });

  // Reconstruct results from point events
  const pointEvents = await prisma.pointEvent.findMany({
    where: {
      ledger: { raceId },
      action: { in: ['BALLOT_RANK_1', 'BALLOT_RANK_2', 'BALLOT_RANK_3'] },
    },
    include: {
      ledger: { select: { userId: true, partyId: true } },
    },
    orderBy: { points: 'desc' },
  });

  const placements = pointEvents.map((pe, idx) => {
    const competitor = competitors.find(
      (c) => c.userId === pe.ledger.userId || c.partyId === pe.ledger.partyId
    );
    return {
      rank: idx + 1,
      competitorId: competitor?.id ?? '',
      name: competitor?.user?.displayName ?? competitor?.party?.name ?? 'Unknown',
      pointsAwarded: pe.points,
    };
  });

  const totalVotes = await prisma.ballot.count({ where: { raceId } });

  return {
    raceId,
    processed: true,
    placements,
    totalVotes,
  };
};
