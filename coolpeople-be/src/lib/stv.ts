/**
 * Single Transferable Vote (STV) Algorithm
 * Used for ballot-type races to determine winners via ranked choice voting
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface STVCandidate {
  id: string;           // competitorId
  name: string;         // display name
  tiebreakPoints: number; // CoolPeople points for tiebreaking
}

export interface STVBallot {
  rankings: string[];   // competitorIds in preference order (index 0 = first choice)
}

export interface STVResult {
  placements: STVPlacement[];
  rounds: STVRound[];
}

export interface STVPlacement {
  rank: number;         // 1 = winner, 2 = second, 3 = third
  candidateId: string;
}

export interface STVRound {
  roundNumber: number;
  voteCounts: Record<string, number>;
  eliminated?: string;
  winner?: string;
}

// -----------------------------------------------------------------------------
// STV Algorithm
// Returns ordered list of candidates by placement (1st, 2nd, 3rd)
// seats parameter determines how many winners (default 1 per round)
// We run multiple rounds to determine 1st, 2nd, 3rd place
// -----------------------------------------------------------------------------

export const runSTV = (
  candidates: STVCandidate[],
  ballots: STVBallot[],
  topN: number = 3
): STVResult => {
  const placements: STVPlacement[] = [];
  const rounds: STVRound[] = [];
  let remainingCandidates = [...candidates];
  let remainingBallots = ballots.map((b) => ({ ...b, rankings: [...b.rankings] }));
  let currentRank = 1;

  // Run STV rounds to find each placement
  while (currentRank <= topN && remainingCandidates.length > 0) {
    const result = runSTVRound(remainingCandidates, remainingBallots, rounds.length + 1);
    rounds.push(...result.rounds);

    if (result.winnerId) {
      placements.push({ rank: currentRank, candidateId: result.winnerId });
      // Remove winner from candidates and ballots for next placement
      remainingCandidates = remainingCandidates.filter((c) => c.id !== result.winnerId);
      remainingBallots = remainingBallots.map((b) => ({
        ...b,
        rankings: b.rankings.filter((r) => r !== result.winnerId),
      }));
      currentRank++;
    } else {
      break; // No more winners possible
    }
  }

  return { placements, rounds };
};

// -----------------------------------------------------------------------------
// Run a single STV election to find one winner
// -----------------------------------------------------------------------------

const runSTVRound = (
  candidates: STVCandidate[],
  ballots: STVBallot[],
  startingRoundNumber: number
): { winnerId: string | null; rounds: STVRound[] } => {
  const rounds: STVRound[] = [];
  let activeCandidateIds = new Set(candidates.map((c) => c.id));
  let currentBallots = ballots.map((b) => ({
    ...b,
    rankings: b.rankings.filter((r) => activeCandidateIds.has(r)),
  }));

  if (activeCandidateIds.size === 0) {
    return { winnerId: null, rounds: [] };
  }

  if (activeCandidateIds.size === 1) {
    const winnerId = [...activeCandidateIds][0];
    return {
      winnerId,
      rounds: [{
        roundNumber: startingRoundNumber,
        voteCounts: { [winnerId]: currentBallots.length },
        winner: winnerId,
      }],
    };
  }

  const totalVotes = currentBallots.filter((b) => b.rankings.length > 0).length;
  // Droop quota for single winner: floor(votes / 2) + 1
  const quota = Math.floor(totalVotes / 2) + 1;
  let roundNumber = startingRoundNumber;

  while (activeCandidateIds.size > 1) {
    // Count first-choice votes
    const voteCounts: Record<string, number> = {};
    for (const id of activeCandidateIds) {
      voteCounts[id] = 0;
    }
    for (const ballot of currentBallots) {
      const firstChoice = ballot.rankings.find((r) => activeCandidateIds.has(r));
      if (firstChoice) {
        voteCounts[firstChoice]++;
      }
    }

    // Check if any candidate meets quota
    const winner = Object.entries(voteCounts).find(([_, count]) => count >= quota);
    if (winner) {
      rounds.push({
        roundNumber,
        voteCounts: { ...voteCounts },
        winner: winner[0],
      });
      return { winnerId: winner[0], rounds };
    }

    // Find candidate with fewest first-choice votes
    let minVotes = Infinity;
    let eliminatedId: string | null = null;

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count < minVotes) {
        minVotes = count;
        eliminatedId = id;
      } else if (count === minVotes && eliminatedId) {
        // Tiebreaker: eliminate candidate with fewer CoolPeople points
        const currentCandidate = candidates.find((c) => c.id === eliminatedId);
        const tiedCandidate = candidates.find((c) => c.id === id);
        if (tiedCandidate && currentCandidate && tiedCandidate.tiebreakPoints > currentCandidate.tiebreakPoints) {
          // Keep the one with more points (eliminate the one with fewer)
          // eliminatedId stays as is since current has fewer points
        } else if (tiedCandidate && currentCandidate && tiedCandidate.tiebreakPoints < currentCandidate.tiebreakPoints) {
          eliminatedId = id; // Eliminate the one with fewer points
        }
      }
    }

    rounds.push({
      roundNumber,
      voteCounts: { ...voteCounts },
      eliminated: eliminatedId ?? undefined,
    });

    if (eliminatedId) {
      activeCandidateIds.delete(eliminatedId);
      // Redistribute eliminated candidate's votes to next choice
      currentBallots = currentBallots.map((b) => ({
        ...b,
        rankings: b.rankings.filter((r) => r !== eliminatedId),
      }));
    }

    roundNumber++;
  }

  // Last candidate standing wins
  const lastCandidateId = [...activeCandidateIds][0];
  if (lastCandidateId) {
    rounds.push({
      roundNumber,
      voteCounts: { [lastCandidateId]: currentBallots.filter((b) => b.rankings.length > 0).length },
      winner: lastCandidateId,
    });
    return { winnerId: lastCandidateId, rounds };
  }

  return { winnerId: null, rounds };
};
