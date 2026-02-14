/**
 * Users Module Types
 */

import type { UserType, Tier, FollowRequestStatus } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Public Profile (what others see)
// -----------------------------------------------------------------------------

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  userType: UserType;
  isVerified: boolean;
  isPrivate: boolean;
  createdAt: Date;

  // Stats
  followersCount: number;
  followingCount: number;

  // Primary party affiliation
  party?: { id: string; name: string } | null;

  // Viewer-specific fields
  isFollowing?: boolean;
  isFavorited?: boolean;

  // Races (sitewide - available for all profiles)
  racesFollowing?: { id: string; title: string; raceType: string }[];
  racesCompeting?: { id: string; title: string; raceType: string }[];

  // Candidate-only fields
  points?: {
    ledgerId: string;
    total: number;
    tier: Tier;
    raceId: string;
    raceName: string;
    raceType: string;
  }[];
  reviewsCount?: number;
  averageRating?: number;
}

// -----------------------------------------------------------------------------
// Private Profile (what the user sees about themselves)
// -----------------------------------------------------------------------------

export interface PrivateProfile extends PublicProfile {
  email: string;
  phone: string | null;
  isFrozen: boolean;
  mediaAccessGranted: boolean;

  // Party memberships
  parties: {
    id: string;
    name: string;
    handle: string;
    permissions: string[];
  }[];

  // Races
  racesFollowing: { id: string; title: string; raceType: string }[];
  racesCompeting: { id: string; title: string; raceType: string }[];

  // Follow requests (pending count for private accounts)
  pendingFollowRequestsCount?: number;
}

// -----------------------------------------------------------------------------
// Follow Request Types
// -----------------------------------------------------------------------------

export interface FollowRequestResponse {
  id: string;
  fromUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: FollowRequestStatus;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Update Types
// -----------------------------------------------------------------------------

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface BecomeCandidateRequest {
  // Future: might require acceptance of terms
  acceptTerms: boolean;
}
