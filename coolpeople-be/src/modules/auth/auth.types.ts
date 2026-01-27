/**
 * Auth Module Types
 */

import type { UserType } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Request/Response Types
// -----------------------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export interface OAuthRequest {
  provider: 'google' | 'apple';
  idToken: string;
}

// -----------------------------------------------------------------------------
// User Types
// -----------------------------------------------------------------------------

// User without sensitive fields (for API responses)
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  userType: UserType;
  isVerified: boolean;
  isFrozen: boolean;
  isPrivate: boolean;
  createdAt: Date;
}

// Fields that can be updated
export interface UpdateUserRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}
