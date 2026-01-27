import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    race: { findMany: vi.fn() },
  },
}));

vi.mock('../modules/races/ballot.service.js', () => ({
  processBallot: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { processBallot } from '../modules/races/ballot.service.js';

const mockPrisma = vi.mocked(prisma);
const mockProcessBallot = vi.mocked(processBallot);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Ballot Process Job', () => {
  // Helper to get a fresh module import (since intervalId is module-level state)
  const importJob = async () => {
    const mod = await import('./ballotProcess.job.js');
    return mod;
  };

  // ---------------------------------------------------------------------------
  // startBallotProcessJob
  // ---------------------------------------------------------------------------

  describe('startBallotProcessJob', () => {
    it('runs immediately on startup', async () => {
      mockPrisma.race.findMany.mockResolvedValue([]);

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();

      // The immediate call should have queried for races
      await vi.advanceTimersByTimeAsync(0);
      expect(mockPrisma.race.findMany).toHaveBeenCalledOnce();

      stopBallotProcessJob();
    });

    it('is idempotent - starting twice does not create a second interval', async () => {
      mockPrisma.race.findMany.mockResolvedValue([]);

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();
      await vi.advanceTimersByTimeAsync(0);

      const callCountAfterFirst = mockPrisma.race.findMany.mock.calls.length;

      // Start again — should be a no-op
      startBallotProcessJob();
      await vi.advanceTimersByTimeAsync(0);

      // No additional immediate call from the second start
      expect(mockPrisma.race.findMany).toHaveBeenCalledTimes(callCountAfterFirst);

      stopBallotProcessJob();
    });
  });

  // ---------------------------------------------------------------------------
  // stopBallotProcessJob
  // ---------------------------------------------------------------------------

  describe('stopBallotProcessJob', () => {
    it('clears the interval so no further runs occur', async () => {
      mockPrisma.race.findMany.mockResolvedValue([]);

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();
      await vi.advanceTimersByTimeAsync(0);

      const callCountBeforeStop = mockPrisma.race.findMany.mock.calls.length;

      stopBallotProcessJob();

      // Advance past several intervals — should not trigger again
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 * 3);
      expect(mockPrisma.race.findMany).toHaveBeenCalledTimes(callCountBeforeStop);
    });
  });

  // ---------------------------------------------------------------------------
  // runBallotProcessJob (tested indirectly via startBallotProcessJob)
  // ---------------------------------------------------------------------------

  describe('processing logic', () => {
    it('processes races with closed, unprocessed ballots', async () => {
      const races = [
        { id: 'race-1', title: 'Mayor Race' },
        { id: 'race-2', title: 'Governor Race' },
      ];

      mockPrisma.race.findMany.mockResolvedValue(races as any);
      mockProcessBallot.mockResolvedValue(undefined as any);

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();

      // Let the immediate run complete
      await vi.advanceTimersByTimeAsync(0);

      expect(mockPrisma.race.findMany).toHaveBeenCalledWith({
        where: {
          winCondition: 'BALLOT',
          ballotClosesAt: { lt: expect.any(Date) },
          ballotProcessed: false,
        },
        select: { id: true, title: true },
      });

      expect(mockProcessBallot).toHaveBeenCalledTimes(2);
      expect(mockProcessBallot).toHaveBeenCalledWith('race-1');
      expect(mockProcessBallot).toHaveBeenCalledWith('race-2');

      stopBallotProcessJob();
    });

    it('skips processing when no races need processing', async () => {
      mockPrisma.race.findMany.mockResolvedValue([]);

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();

      await vi.advanceTimersByTimeAsync(0);

      expect(mockPrisma.race.findMany).toHaveBeenCalledOnce();
      expect(mockProcessBallot).not.toHaveBeenCalled();

      stopBallotProcessJob();
    });

    it('handles errors in individual ballot processing gracefully', async () => {
      const races = [
        { id: 'race-ok', title: 'Good Race' },
        { id: 'race-fail', title: 'Bad Race' },
        { id: 'race-ok-2', title: 'Another Good Race' },
      ];

      mockPrisma.race.findMany.mockResolvedValue(races as any);
      mockProcessBallot
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('DB connection lost'))
        .mockResolvedValueOnce(undefined as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { startBallotProcessJob, stopBallotProcessJob } = await importJob();
      startBallotProcessJob();

      await vi.advanceTimersByTimeAsync(0);

      // All three should have been attempted despite the middle one failing
      expect(mockProcessBallot).toHaveBeenCalledTimes(3);
      expect(mockProcessBallot).toHaveBeenCalledWith('race-ok');
      expect(mockProcessBallot).toHaveBeenCalledWith('race-fail');
      expect(mockProcessBallot).toHaveBeenCalledWith('race-ok-2');

      // Error should have been logged for the failed race
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('race-fail'),
        expect.any(String),
      );

      consoleErrorSpy.mockRestore();
      stopBallotProcessJob();
    });
  });
});
