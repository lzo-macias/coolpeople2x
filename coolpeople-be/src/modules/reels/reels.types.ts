/**
 * Reels Module Types
 */

// -----------------------------------------------------------------------------
// Reel Response (returned from API)
// -----------------------------------------------------------------------------

export interface ReelResponse {
  id: string;

  // User info (frontend format)
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    avatarUrl: string | null;
    party: string | null;
    isParticipant: boolean;
  };

  // Creator (backwards compatibility)
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  partyId: string | null;
  isPartyPost: boolean; // True = party-only post, False = user post (may also be in party feed)
  party?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
  } | null;

  // Media
  videoUrl: string;
  thumbnailUrl: string | null;
  thumbnail: string | null; // Alias for frontend compatibility
  selfieOverlayUrl: string | null;
  duration: number;
  isMirrored: boolean; // Default false, for frontend compatibility

  // Metadata
  title: string | null;
  description: string | null;
  caption: string | null; // Alias for description (frontend uses 'caption')

  // Engagement counts
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  repostCount: number;
  viewCount: number;

  // Stats (frontend format)
  stats: {
    likes: string;
    comments: string;
    shares: string;
    saves: string;
    reposts: string;
    votes: string;
    shazam: string;
  };

  // Viewer context (when authenticated)
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;

  // Repost context (when viewing a repost in feed)
  repostedBy?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  repostedAt?: Date;
  originalReelId?: string;

  // Tags
  hashtags: string[];
  mentions: { id: string; username: string }[];
  raceTargets: { id: string; title: string }[];
  targetRace: string | null; // First race target title (frontend uses this)

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
  isMirrored?: boolean;
  title?: string;
  description?: string;
  partyId?: string;
  isPartyPost?: boolean; // True = party-only post (shows only in party feed)
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
