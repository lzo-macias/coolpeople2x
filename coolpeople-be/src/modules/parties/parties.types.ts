/**
 * Parties Module Types
 */

// -----------------------------------------------------------------------------
// Party Response
// -----------------------------------------------------------------------------

export interface PartyResponse {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isPrivate: boolean;
  chatMode: string;
  memberCount: number;
  followerCount: number;
  isFollowing?: boolean;
  isMember?: boolean;
  myPermissions?: string[];
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Member Response
// -----------------------------------------------------------------------------

export interface MemberResponse {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  permissions: string[];
  joinedAt: Date;
}

// -----------------------------------------------------------------------------
// Join Request Response
// -----------------------------------------------------------------------------

export interface JoinRequestResponse {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: string;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Chat Message Response
// -----------------------------------------------------------------------------

export interface ChatMessageResponse {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reactions: { emoji: string; count: number; reacted: boolean }[];
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreatePartyRequest {
  name: string;
  handle: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPrivate?: boolean;
  chatMode?: string;
}

export interface UpdatePartyRequest {
  name?: string;
  handle?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPrivate?: boolean;
  chatMode?: string;
}

export interface UpdateMemberPermissionsRequest {
  permissions: string[];
}

// -----------------------------------------------------------------------------
// Banned Member Response
// -----------------------------------------------------------------------------

export interface BannedMemberResponse {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannedBy: {
    id: string;
    username: string;
    displayName: string;
  };
  reason: string | null;
  bannedAt: Date;
}

// -----------------------------------------------------------------------------
// Party Follower Response
// -----------------------------------------------------------------------------

export interface PartyFollowerResponse {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  partyName: string | null;
  isFollowing?: boolean;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Party Race Response
// -----------------------------------------------------------------------------

export interface PartyRaceResponse {
  id: string;
  raceId: string;
  raceName: string;
  raceType: string;
  position: number | null;
  totalPoints: number;
  tier: string;
  change: string;
  isSystemRace: boolean;
}

// -----------------------------------------------------------------------------
// Party Review Response
// -----------------------------------------------------------------------------

export interface PartyReviewResponse {
  id: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    partyName: string | null;
  };
  rating: number;
  content: string | null;
  createdAt: Date;
  replies: {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    content: string;
    createdAt: Date;
  }[];
}

// -----------------------------------------------------------------------------
// Full Party Profile Response
// -----------------------------------------------------------------------------

export interface FullPartyProfileResponse extends PartyResponse {
  stats: {
    cpPoints: number;
    tier: string;
    change: string;
    raceCount: number;
  };
  averageRating: number | null;
  reviewCount: number;
}
