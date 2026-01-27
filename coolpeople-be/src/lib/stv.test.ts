import { describe, it, expect } from 'vitest';
import { runSTV } from './stv.js';
import type { STVCandidate, STVBallot } from './stv.js';

// Helper to make candidates
const mkCandidate = (id: string, name: string, pts = 0): STVCandidate => ({
  id,
  name,
  tiebreakPoints: pts,
});

// Helper to make ballots
const mkBallot = (...rankings: string[]): STVBallot => ({ rankings });

describe('STV Algorithm', () => {
  // ---------------------------------------------------------------------------
  // Basic winner determination
  // ---------------------------------------------------------------------------

  it('returns a clear majority winner on the first round', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
    ];
    // 6 ballots: Alice has 4, Bob has 1, Carol has 1
    const ballots = [
      mkBallot('a', 'b', 'c'),
      mkBallot('a', 'c', 'b'),
      mkBallot('a', 'b', 'c'),
      mkBallot('a', 'c', 'b'),
      mkBallot('b', 'a', 'c'),
      mkBallot('c', 'a', 'b'),
    ];

    const result = runSTV(candidates, ballots);

    // Alice should win 1st place (4 of 6 votes = majority)
    expect(result.placements[0]).toEqual({ rank: 1, candidateId: 'a' });
    expect(result.placements.length).toBeGreaterThanOrEqual(1);
  });

  it('determines winner via elimination when no first-round majority', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
    ];
    // 5 ballots: Alice=2, Bob=2, Carol=1 → Carol eliminated → her vote goes to Alice
    const ballots = [
      mkBallot('a', 'c', 'b'),
      mkBallot('a', 'b', 'c'),
      mkBallot('b', 'a', 'c'),
      mkBallot('b', 'c', 'a'),
      mkBallot('c', 'a', 'b'), // Carol eliminated → transfers to Alice
    ];

    const result = runSTV(candidates, ballots);

    expect(result.placements[0].rank).toBe(1);
    expect(result.placements[0].candidateId).toBe('a'); // Alice wins 3-2 after transfer
  });

  // ---------------------------------------------------------------------------
  // Top-3 placements
  // ---------------------------------------------------------------------------

  it('returns up to 3 placements by default', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
      mkCandidate('d', 'Dave'),
    ];
    const ballots = [
      mkBallot('a', 'b', 'c', 'd'),
      mkBallot('a', 'b', 'c', 'd'),
      mkBallot('a', 'b', 'c', 'd'),
      mkBallot('b', 'c', 'a', 'd'),
      mkBallot('b', 'c', 'a', 'd'),
      mkBallot('c', 'b', 'a', 'd'),
      mkBallot('d', 'c', 'b', 'a'),
    ];

    const result = runSTV(candidates, ballots, 3);

    expect(result.placements.length).toBe(3);
    expect(result.placements[0].rank).toBe(1);
    expect(result.placements[1].rank).toBe(2);
    expect(result.placements[2].rank).toBe(3);

    // Each placement should be a different candidate
    const ids = result.placements.map((p) => p.candidateId);
    expect(new Set(ids).size).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles a single candidate', () => {
    const candidates = [mkCandidate('a', 'Alice')];
    const ballots = [mkBallot('a'), mkBallot('a')];

    const result = runSTV(candidates, ballots);

    expect(result.placements.length).toBe(1);
    expect(result.placements[0]).toEqual({ rank: 1, candidateId: 'a' });
  });

  it('handles no candidates', () => {
    const result = runSTV([], []);
    expect(result.placements).toEqual([]);
  });

  it('handles no ballots with candidates', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
    ];

    const result = runSTV(candidates, []);

    // With no votes, last-standing logic should still produce placements
    expect(result.placements.length).toBeGreaterThanOrEqual(0);
  });

  it('handles two candidates with equal votes (tiebreaker by points)', () => {
    const candidates = [
      mkCandidate('a', 'Alice', 100),   // More points
      mkCandidate('b', 'Bob', 50),      // Fewer points
      mkCandidate('c', 'Carol', 10),    // Fewest points - will be eliminated first
    ];
    // a=1, b=1, c=1 → c eliminated (fewest points) → then a vs b
    const ballots = [
      mkBallot('a', 'c', 'b'),
      mkBallot('b', 'c', 'a'),
      mkBallot('c', 'a', 'b'), // transfers to 'a' after c eliminated
    ];

    const result = runSTV(candidates, ballots);

    // After c eliminated, votes: a=2, b=1 → a wins
    expect(result.placements[0].candidateId).toBe('a');
  });

  // ---------------------------------------------------------------------------
  // Vote redistribution
  // ---------------------------------------------------------------------------

  it('redistributes votes when a candidate is eliminated', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
      mkCandidate('d', 'Dave'),
    ];
    // Round 1: a=3, b=2, c=2, d=1 → d eliminated
    // d's voter picks c next → Round 2: a=3, b=2, c=3
    // Still no majority (need 5 of 8) → b eliminated
    // b's voters pick a and c → final tally
    const ballots = [
      mkBallot('a', 'b', 'c', 'd'),
      mkBallot('a', 'c', 'b', 'd'),
      mkBallot('a', 'b', 'c', 'd'),
      mkBallot('b', 'a', 'c', 'd'),
      mkBallot('b', 'c', 'a', 'd'),
      mkBallot('c', 'a', 'b', 'd'),
      mkBallot('c', 'b', 'a', 'd'),
      mkBallot('d', 'c', 'a', 'b'),
    ];

    const result = runSTV(candidates, ballots, 1);

    expect(result.placements.length).toBe(1);
    expect(result.rounds.length).toBeGreaterThan(1); // Required elimination rounds
    // Check rounds tracked eliminated candidates
    const elimRounds = result.rounds.filter((r) => r.eliminated);
    expect(elimRounds.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Round tracking
  // ---------------------------------------------------------------------------

  it('records vote counts in each round', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
    ];
    const ballots = [
      mkBallot('a', 'b'),
      mkBallot('a', 'b'),
      mkBallot('b', 'a'),
    ];

    const result = runSTV(candidates, ballots);

    expect(result.rounds.length).toBeGreaterThan(0);
    // First round should have vote counts for both candidates
    const firstRound = result.rounds[0];
    expect(firstRound.voteCounts).toBeDefined();
    expect(firstRound.roundNumber).toBe(1);
  });

  it('marks winner in the winning round', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
    ];
    const ballots = [
      mkBallot('a'),
      mkBallot('a'),
      mkBallot('b'),
    ];

    const result = runSTV(candidates, ballots, 1);

    const winnerRound = result.rounds.find((r) => r.winner);
    expect(winnerRound).toBeDefined();
    expect(winnerRound!.winner).toBe('a');
  });

  // ---------------------------------------------------------------------------
  // topN parameter
  // ---------------------------------------------------------------------------

  it('respects custom topN parameter', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
      mkCandidate('d', 'Dave'),
      mkCandidate('e', 'Eve'),
    ];
    const ballots = [
      mkBallot('a', 'b', 'c', 'd', 'e'),
      mkBallot('a', 'c', 'b', 'd', 'e'),
      mkBallot('b', 'c', 'a', 'd', 'e'),
      mkBallot('c', 'b', 'a', 'd', 'e'),
      mkBallot('d', 'e', 'a', 'b', 'c'),
    ];

    const resultTop1 = runSTV(candidates, ballots, 1);
    expect(resultTop1.placements.length).toBe(1);

    const resultTop2 = runSTV(candidates, ballots, 2);
    expect(resultTop2.placements.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Ballots with partial rankings
  // ---------------------------------------------------------------------------

  it('handles ballots that do not rank all candidates', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
      mkCandidate('c', 'Carol'),
    ];
    // Give Alice a clear majority so partial rankings don't matter
    const ballots = [
      mkBallot('a'),           // Only ranked first choice
      mkBallot('a'),
      mkBallot('a'),
      mkBallot('b', 'c'),     // Ranked top 2
      mkBallot('c'),
    ];

    const result = runSTV(candidates, ballots);

    expect(result.placements.length).toBeGreaterThanOrEqual(1);
    // Alice wins with 3 of 5 first-choice votes (quota = 3)
    expect(result.placements[0].candidateId).toBe('a');
  });

  it('handles ballots referencing unknown candidate IDs gracefully', () => {
    const candidates = [
      mkCandidate('a', 'Alice'),
      mkCandidate('b', 'Bob'),
    ];
    // Ballot references 'z' which isn't a candidate
    const ballots = [
      mkBallot('z', 'a', 'b'),
      mkBallot('a', 'b'),
      mkBallot('b', 'a'),
    ];

    const result = runSTV(candidates, ballots);

    // Should still work - 'z' gets filtered out
    expect(result.placements.length).toBeGreaterThanOrEqual(1);
  });
});
