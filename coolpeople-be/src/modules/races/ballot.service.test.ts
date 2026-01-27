import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    race: { findUnique: vi.fn(), update: vi.fn() },
    ballot: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    ballotRanking: { deleteMany: vi.fn(), create: vi.fn() },
    raceFollow: { findUnique: vi.fn(), findMany: vi.fn() },
    raceCompetitor: { findMany: vi.fn() },
    pointLedger: { findMany: vi.fn() },
    pointEvent: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../lib/socket.js', () => ({ getIO: vi.fn() }));
vi.mock('../points/points.service.js', () => ({
  recordPointEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../notifications/notifications.service.js', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../lib/prisma.js';
import { getBallotStatus, submitBallot, updateBallot, getBallotResults } from './ballot.service.js';

const mockPrisma = vi.mocked(prisma);

const now = new Date();
const past = new Date(now.getTime() - 86400000);
const future = new Date(now.getTime() + 86400000);

const makeBallotRace = (overrides: Record<string, unknown> = {}) => ({
  id: 'race1',
  title: 'Test Race',
  winCondition: 'BALLOT',
  ballotOpensAt: past,
  ballotClosesAt: future,
  ballotProcessed: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Ballot Service', () => {
  // ---------------------------------------------------------------------------
  // getBallotStatus
  // ---------------------------------------------------------------------------

  describe('getBallotStatus', () => {
    it('returns ballot status for a ballot race', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.ballot.findUnique.mockResolvedValue(null);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1', userId: 'u1', partyId: null, user: { id: 'u1', displayName: 'Alice' }, party: null },
      ] as any);

      const status = await getBallotStatus('race1', 'voter1');

      expect(status.raceId).toBe('race1');
      expect(status.isOpen).toBe(true);
      expect(status.hasVoted).toBe(false);
      expect(status.competitors).toHaveLength(1);
    });

    it('throws if race is not BALLOT type', async () => {
      mockPrisma.race.findUnique.mockResolvedValue({
        ...makeBallotRace(),
        winCondition: 'POINTS',
      } as any);

      await expect(getBallotStatus('race1', 'voter1'))
        .rejects.toThrow('This race does not use ballot voting');
    });

    it('returns hasVoted=true when user has existing ballot', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.ballot.findUnique.mockResolvedValue({
        id: 'b1',
        rankings: [{ competitorId: 'c1', rank: 1 }],
      } as any);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([]);

      const status = await getBallotStatus('race1', 'voter1');

      expect(status.hasVoted).toBe(true);
      expect(status.userBallot?.id).toBe('b1');
    });

    it('shows isOpen=false when ballot is not yet open', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(
        makeBallotRace({ ballotOpensAt: future, ballotClosesAt: new Date(future.getTime() + 86400000) }) as any
      );
      mockPrisma.ballot.findUnique.mockResolvedValue(null);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([]);

      const status = await getBallotStatus('race1', 'voter1');
      expect(status.isOpen).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // submitBallot
  // ---------------------------------------------------------------------------

  describe('submitBallot', () => {
    it('submits a ballot with rankings', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.raceFollow.findUnique.mockResolvedValue({ id: 'rf1' } as any);
      mockPrisma.ballot.findUnique.mockResolvedValue(null); // No existing ballot
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ] as any);
      mockPrisma.ballot.create.mockResolvedValue({ id: 'b1' } as any);

      const result = await submitBallot('race1', 'voter1', [
        { competitorId: 'c1', rank: 1 },
        { competitorId: 'c2', rank: 2 },
      ]);

      expect(result.ballotId).toBe('b1');
      expect(mockPrisma.ballot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          raceId: 'race1',
          voterId: 'voter1',
        }),
      });
    });

    it('rejects if ballot is not open', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(
        makeBallotRace({ ballotOpensAt: future }) as any
      );

      await expect(
        submitBallot('race1', 'voter1', [{ competitorId: 'c1', rank: 1 }])
      ).rejects.toThrow('Ballot is not currently open');
    });

    it('rejects if user does not follow the race', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.raceFollow.findUnique.mockResolvedValue(null);

      await expect(
        submitBallot('race1', 'voter1', [{ competitorId: 'c1', rank: 1 }])
      ).rejects.toThrow('You must follow this race to vote');
    });

    it('rejects if user already submitted a ballot', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.raceFollow.findUnique.mockResolvedValue({ id: 'rf1' } as any);
      mockPrisma.ballot.findUnique.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        submitBallot('race1', 'voter1', [{ competitorId: 'c1', rank: 1 }])
      ).rejects.toThrow('You have already submitted a ballot');
    });

    it('rejects if competitor is not in the race', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.raceFollow.findUnique.mockResolvedValue({ id: 'rf1' } as any);
      mockPrisma.ballot.findUnique.mockResolvedValue(null);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1' },
      ] as any);

      await expect(
        submitBallot('race1', 'voter1', [
          { competitorId: 'c1', rank: 1 },
          { competitorId: 'nonexistent', rank: 2 },
        ])
      ).rejects.toThrow('Competitor nonexistent is not in this race');
    });

    it('rejects duplicate ranks', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.raceFollow.findUnique.mockResolvedValue({ id: 'rf1' } as any);
      mockPrisma.ballot.findUnique.mockResolvedValue(null);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ] as any);

      await expect(
        submitBallot('race1', 'voter1', [
          { competitorId: 'c1', rank: 1 },
          { competitorId: 'c2', rank: 1 },
        ])
      ).rejects.toThrow('Duplicate ranks');
    });

    it('rejects if ballot already processed', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(
        makeBallotRace({ ballotProcessed: true }) as any
      );

      await expect(
        submitBallot('race1', 'voter1', [{ competitorId: 'c1', rank: 1 }])
      ).rejects.toThrow('Ballot has already been processed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateBallot
  // ---------------------------------------------------------------------------

  describe('updateBallot', () => {
    it('updates an existing ballot', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.ballot.findUnique.mockResolvedValue({ id: 'b1' } as any);
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ] as any);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await updateBallot('race1', 'voter1', [
        { competitorId: 'c2', rank: 1 },
        { competitorId: 'c1', rank: 2 },
      ]);

      expect(result.ballotId).toBe('b1');
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it('throws if no existing ballot to update', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(makeBallotRace() as any);
      mockPrisma.ballot.findUnique.mockResolvedValue(null);

      await expect(
        updateBallot('race1', 'voter1', [{ competitorId: 'c1', rank: 1 }])
      ).rejects.toThrow('Ballot not found');
    });
  });

  // ---------------------------------------------------------------------------
  // getBallotResults
  // ---------------------------------------------------------------------------

  describe('getBallotResults', () => {
    it('returns processed ballot results', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(
        makeBallotRace({ ballotProcessed: true }) as any
      );
      mockPrisma.raceCompetitor.findMany.mockResolvedValue([
        { id: 'c1', userId: 'u1', partyId: null, user: { displayName: 'Alice' }, party: null },
      ] as any);
      mockPrisma.pointEvent.findMany.mockResolvedValue([
        { points: 8, ledger: { userId: 'u1', partyId: null } },
      ] as any);
      mockPrisma.ballot.count.mockResolvedValue(10);

      const results = await getBallotResults('race1');

      expect(results.processed).toBe(true);
      expect(results.totalVotes).toBe(10);
      expect(results.placements).toHaveLength(1);
      expect(results.placements[0].pointsAwarded).toBe(8);
    });

    it('throws if ballot not yet processed', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(
        makeBallotRace({ ballotProcessed: false }) as any
      );

      await expect(getBallotResults('race1'))
        .rejects.toThrow('Ballot results are not yet available');
    });

    it('throws NotFoundError for nonexistent race', async () => {
      mockPrisma.race.findUnique.mockResolvedValue(null);

      await expect(getBallotResults('bad-id'))
        .rejects.toThrow('Race not found');
    });
  });
});
