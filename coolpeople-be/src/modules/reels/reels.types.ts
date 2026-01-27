/**
 * Reels Module Types
 */

// -----------------------------------------------------------------------------
// Reel Response (returned from API)
// -----------------------------------------------------------------------------

export interface ReelResponse {
  id: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  party?: {
    id: string;
    name: string;
    handle: string;
  } | null;

  // Media
  videoUrl: string;
  thumbnailUrl: string | null;
  selfieOverlayUrl: string | null;
  duration: number;

  // Metadata
  title: string | null;
  description: string | null;

  // Engagement counts
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  repostCount: number;
  viewCount: number;

  // Viewer context (when authenticated)
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;

  // Tags
  hashtags: string[];
  mentions: { id: string; username: string }[];
  raceTargets: { id: string; title: string }[];

  // Quote parent
  quoteParent?: {
    id: string;
    creator: { id: string; username: string };
    thumbnailUrl: string | null;
  } | null;

  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Create Reel Request
// -----------------------------------------------------------------------------

export interface CreateReelRequest {
  videoUrl: string;
  thumbnailUrl?: string;
  selfieOverlayUrl?: string;
  duration: number;
  title?: string;
  description?: string;
  partyId?: string;
  quoteParentId?: string;
  soundId?: string;
  locationId?: string;
  raceIds?: string[];
}

// -----------------------------------------------------------------------------
// Feed Reel (extended with scoring for feed queries)
// -----------------------------------------------------------------------------

export interface FeedReel extends ReelResponse {
  score?: number;
}
