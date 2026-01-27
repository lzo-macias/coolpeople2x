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
