/**
 * Stories Module Types
 */

// -----------------------------------------------------------------------------
// Story Response
// -----------------------------------------------------------------------------

export interface StoryResponse {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  viewCount: number;
  isViewed?: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// -----------------------------------------------------------------------------
// Story Feed (grouped by user)
// -----------------------------------------------------------------------------

export interface StoryFeedGroup {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  stories: StoryResponse[];
  hasUnviewed: boolean;
}

// -----------------------------------------------------------------------------
// Create Story Request
// -----------------------------------------------------------------------------

export interface CreateStoryRequest {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
}
