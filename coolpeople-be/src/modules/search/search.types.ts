/**
 * Search Module Types
 */

// -----------------------------------------------------------------------------
// Search Results
// -----------------------------------------------------------------------------

export interface SearchUserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  userType: string;
}

export interface SearchPartyResult {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  avatarUrl: string | null;
}

export interface SearchRaceResult {
  id: string;
  title: string;
  description: string | null;
  raceType: string;
}

export interface SearchReelResult {
  id: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  creator: {
    id: string;
    username: string;
  };
}

export interface SearchHashtagResult {
  id: string;
  name: string;
  reelCount: number;
}

export interface SearchResults {
  users: SearchUserResult[];
  parties: SearchPartyResult[];
  races: SearchRaceResult[];
  reels: SearchReelResult[];
  hashtags: SearchHashtagResult[];
}
