/**
 * Reviews Module Types
 */

// -----------------------------------------------------------------------------
// Review Response
// -----------------------------------------------------------------------------

export interface ReviewAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ReviewReplyResponse {
  id: string;
  user: ReviewAuthor;
  content: string;
  createdAt: Date;
}

export interface ReviewResponse {
  id: string;
  author: ReviewAuthor;
  rating: number;
  content: string | null;
  replies: ReviewReplyResponse[];
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Create Review Request
// -----------------------------------------------------------------------------

export interface CreateReviewRequest {
  rating: number;
  content?: string;
}

// -----------------------------------------------------------------------------
// Create Reply Request
// -----------------------------------------------------------------------------

export interface CreateReplyRequest {
  content: string;
}
