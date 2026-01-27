import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('./races.service.js', () => ({
  createRace: vi.fn(),
  getRace: vi.fn(),
  updateRace: vi.fn(),
  deleteRace: vi.fn(),
  listRaces: vi.fn(),
  followRace: vi.fn(),
  unfollowRace: vi.fn(),
  competeInRace: vi.fn(),
  leaveRace: vi.fn(),
  getCompetitors: vi.fn(),
  getScoreboard: vi.fn(),
  nominateCandidate: vi.fn(),
  getUserNominations: vi.fn(),
}));

vi.mock('./ballot.service.js', () => ({
  getBallotStatus: vi.fn(),
  submitBallot: vi.fn(),
  updateBallot: vi.fn(),
  getBallotResults: vi.fn(),
}));

vi.mock('../../lib/response.js', () => ({
  sendSuccess: vi.fn(),
  sendCreated: vi.fn(),
  sendNoContent: vi.fn(),
  sendPaginated: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import * as ballotService from './ballot.service.js';
import { sendSuccess, sendCreated } from '../../lib/response.js';
import {
  getBallotStatus,
  submitBallot,
  updateBallot,
  getBallotResults,
} from './races.controller.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockBallotService = vi.mocked(ballotService);
const mockSendSuccess = vi.mocked(sendSuccess);
const mockSendCreated = vi.mocked(sendCreated);

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: { id: 'race1' },
    user: { userId: 'u1' },
    query: {},
    body: {},
    ...overrides,
  }) as any;

const makeRes = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  }) as any;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Ballot Controller Methods', () => {
  // -------------------------------------------------------------------------
  // getBallotStatus
  // -------------------------------------------------------------------------

  describe('getBallotStatus', () => {
    it('calls ballotService.getBallotStatus with raceId and userId, then sendSuccess', async () => {
      const statusPayload = { raceId: 'race1', isOpen: true, hasVoted: false };
      mockBallotService.getBallotStatus.mockResolvedValue(statusPayload as any);

      const req = makeReq();
      const res = makeRes();

      await getBallotStatus(req, res);

      expect(mockBallotService.getBallotStatus).toHaveBeenCalledWith('race1', 'u1');
      expect(mockSendSuccess).toHaveBeenCalledWith(res, statusPayload);
    });
  });

  // -------------------------------------------------------------------------
  // submitBallot
  // -------------------------------------------------------------------------

  describe('submitBallot', () => {
    it('calls ballotService.submitBallot with raceId, userId, and rankings, then sendCreated', async () => {
      const rankings = [
        { competitorId: 'c1', rank: 1 },
        { competitorId: 'c2', rank: 2 },
      ];
      const resultPayload = { ballotId: 'b1' };
      mockBallotService.submitBallot.mockResolvedValue(resultPayload);

      const req = makeReq({ body: { rankings } });
      const res = makeRes();

      await submitBallot(req, res);

      expect(mockBallotService.submitBallot).toHaveBeenCalledWith('race1', 'u1', rankings);
      expect(mockSendCreated).toHaveBeenCalledWith(res, resultPayload);
    });
  });

  // -------------------------------------------------------------------------
  // updateBallot
  // -------------------------------------------------------------------------

  describe('updateBallot', () => {
    it('calls ballotService.updateBallot with raceId, userId, and rankings, then sendSuccess', async () => {
      const rankings = [
        { competitorId: 'c2', rank: 1 },
        { competitorId: 'c1', rank: 2 },
      ];
      const resultPayload = { ballotId: 'b1' };
      mockBallotService.updateBallot.mockResolvedValue(resultPayload);

      const req = makeReq({ body: { rankings } });
      const res = makeRes();

      await updateBallot(req, res);

      expect(mockBallotService.updateBallot).toHaveBeenCalledWith('race1', 'u1', rankings);
      expect(mockSendSuccess).toHaveBeenCalledWith(res, resultPayload);
    });
  });

  // -------------------------------------------------------------------------
  // getBallotResults
  // -------------------------------------------------------------------------

  describe('getBallotResults', () => {
    it('calls ballotService.getBallotResults with raceId, then sendSuccess', async () => {
      const resultsPayload = {
        raceId: 'race1',
        processed: true,
        placements: [{ rank: 1, competitorId: 'c1', name: 'Alice', pointsAwarded: 8 }],
        totalVotes: 10,
      };
      mockBallotService.getBallotResults.mockResolvedValue(resultsPayload as any);

      const req = makeReq();
      const res = makeRes();

      await getBallotResults(req, res);

      expect(mockBallotService.getBallotResults).toHaveBeenCalledWith('race1');
      expect(mockSendSuccess).toHaveBeenCalledWith(res, resultsPayload);
    });

    it('does not pass req.user to ballotService.getBallotResults (optional auth)', async () => {
      const resultsPayload = {
        raceId: 'race1',
        processed: true,
        placements: [],
        totalVotes: 0,
      };
      mockBallotService.getBallotResults.mockResolvedValue(resultsPayload as any);

      const req = makeReq({ user: undefined });
      const res = makeRes();

      await getBallotResults(req, res);

      // Service is called with only the raceId — no userId argument
      expect(mockBallotService.getBallotResults).toHaveBeenCalledTimes(1);
      expect(mockBallotService.getBallotResults).toHaveBeenCalledWith('race1');
      expect(mockSendSuccess).toHaveBeenCalledWith(res, resultsPayload);
    });
  });
});
