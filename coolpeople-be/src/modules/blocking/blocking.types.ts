/**
 * Blocking Module Types
 */

// -----------------------------------------------------------------------------
// Block Response
// -----------------------------------------------------------------------------

export interface BlockResponse {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Blocked User (for the blocked list endpoint)
// -----------------------------------------------------------------------------

export interface BlockedUserResponse {
  id: string;
  blockedId: string;
  createdAt: Date;
  blocked: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}
