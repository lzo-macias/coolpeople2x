/**
 * Races Module Types
 */

// -----------------------------------------------------------------------------
// Race Response
// -----------------------------------------------------------------------------

export interface RaceResponse {
  id: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  raceType: string;
  winCondition: string;
  endDate: Date | null;
  ballotOpenDate: Date | null;
  isSystemRace: boolean;
  creatorId: string | null;
  competitorCount: number;
  followerCount: number;
  isFollowing?: boolean;
  isCompeting?: boolean;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Competitor Response
// -----------------------------------------------------------------------------

export interface CompetitorResponse {
  id: string;
  rank: number;
  totalPoints: number;
  tier: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  party?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
  };
}

// -----------------------------------------------------------------------------
// Scoreboard Response
// -----------------------------------------------------------------------------

export interface ScoreboardEntry extends CompetitorResponse {
  sparkline?: { date: string; points: number }[];
}

// -----------------------------------------------------------------------------
// Nomination Response
// -----------------------------------------------------------------------------

export interface NominationResponse {
  id: string;
  nominator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  nominee: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  race: {
    id: string;
    title: string;
  };
  reelId: string;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Create / Update Race Request
// -----------------------------------------------------------------------------

export interface CreateRaceRequest {
  title: string;
  description?: string;
  bannerUrl?: string;
  raceType: 'CANDIDATE_VS_CANDIDATE' | 'PARTY_VS_PARTY';
  winCondition: 'POINTS' | 'BALLOT';
  endDate?: string;
  ballotOpenDate?: string;
}

export interface UpdateRaceRequest {
  title?: string;
  description?: string;
  bannerUrl?: string;
  endDate?: string;
  ballotOpenDate?: string;
}
