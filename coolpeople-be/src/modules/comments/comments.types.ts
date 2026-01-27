/**
 * Comments Module Types
 */

// -----------------------------------------------------------------------------
// Comment Response
// -----------------------------------------------------------------------------

export interface CommentResponse {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reelId: string;
  content: string;
  parentId: string | null;
  likeCount: number;
  isLiked?: boolean;
  replies?: CommentResponse[];
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Create Comment Request
// -----------------------------------------------------------------------------

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}
