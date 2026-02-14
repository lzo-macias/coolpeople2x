/**
 * Reviews Service
 * Business logic for review and reply management
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type {
  ReviewResponse,
  ReviewReplyResponse,
  CreateReviewRequest,
  CreateReplyRequest,
} from './reviews.types.js';

// =============================================================================
// HELPERS
// =============================================================================

const reviewIncludes = {
  author: {
    select: {
      id: true, username: true, displayName: true, avatarUrl: true,
      subscription: { select: { tier: true, endDate: true } },
    },
  },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  },
};

const formatReview = (review: any): ReviewResponse => ({
  id: review.id,
  author: review.author,
  rating: review.rating,
  content: review.content,
  replies: (review.replies ?? []).map((r: any) => formatReply(r)),
  createdAt: review.createdAt,
});

const formatReply = (reply: any): ReviewReplyResponse => ({
  id: reply.id,
  user: reply.user,
  content: reply.content,
  createdAt: reply.createdAt,
});

/**
 * Map a star rating to its PointAction and weight
 */
const getReviewPointAction = (rating: number): { action: string; points: number } => {
  switch (rating) {
    case 5:
      return { action: 'REVIEW_5_STAR', points: POINT_WEIGHTS.REVIEW_5_STAR };
    case 4:
      return { action: 'REVIEW_4_STAR', points: POINT_WEIGHTS.REVIEW_4_STAR };
    case 3:
      return { action: 'REVIEW_3_STAR', points: POINT_WEIGHTS.REVIEW_3_STAR };
    case 2:
      return { action: 'REVIEW_2_STAR', points: POINT_WEIGHTS.REVIEW_2_STAR };
    case 1:
      return { action: 'REVIEW_1_STAR', points: POINT_WEIGHTS.REVIEW_1_STAR };
    default:
      return { action: 'REVIEW_3_STAR', points: POINT_WEIGHTS.REVIEW_3_STAR };
  }
};

// =============================================================================
// USER REVIEWS
// =============================================================================

// -----------------------------------------------------------------------------
// Create Review for a User
// -----------------------------------------------------------------------------

export const createUserReview = async (
  targetUserId: string,
  authorId: string,
  data: CreateReviewRequest
): Promise<ReviewResponse> => {
  // Verify target user exists and is a CANDIDATE
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, userType: true },
  });
  if (!targetUser) throw new NotFoundError('User');
  if (targetUser.userType !== 'CANDIDATE') {
    throw new ForbiddenError('Only candidates can receive reviews');
  }

  // Cannot review yourself
  if (targetUserId === authorId) {
    throw new ForbiddenError('You cannot review yourself');
  }

  const review = await prisma.review.create({
    data: {
      authorId,
      targetUserId,
      rating: data.rating,
      content: data.content,
    },
    include: reviewIncludes,
  });

  // Award points to target user in all races they compete in
  const { action, points } = getReviewPointAction(data.rating);
  const competitors = await prisma.raceCompetitor.findMany({
    where: { userId: targetUserId },
    select: { raceId: true },
  });

  await Promise.all(
    competitors.map((c) =>
      recordPointEvent({
        targetUserId,
        raceId: c.raceId,
        action,
        points,
        sourceUserId: authorId,
      }).catch(() => {})
    )
  );

  // Review notification
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { username: true, avatarUrl: true },
  });
  createNotification({
    userId: targetUserId,
    type: 'REVIEW',
    title: 'New review',
    body: `${author?.username ?? 'Someone'} left a ${data.rating}-star review`,
    data: {
      reviewId: review.id,
      rating: data.rating,
      actorUsername: author?.username,
      actorAvatarUrl: author?.avatarUrl,
    },
  }).catch(() => {});

  return formatReview(review);
};

// -----------------------------------------------------------------------------
// Get Reviews for a User
// -----------------------------------------------------------------------------

export const getUserReviews = async (
  targetUserId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reviews: ReviewResponse[]; nextCursor: string | null }> => {
  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!targetUser) throw new NotFoundError('User');

  const reviews = await prisma.review.findMany({
    where: { targetUserId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: reviewIncludes,
  });

  const hasMore = reviews.length > limit;
  const results = hasMore ? reviews.slice(0, -1) : reviews;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Sort premium authors' reviews first, then by createdAt desc
  const sorted = results.sort((a: any, b: any) => {
    const aSub = a.author.subscription;
    const bSub = b.author.subscription;
    const aIsPremium = aSub && (!aSub.endDate || aSub.endDate > new Date());
    const bIsPremium = bSub && (!bSub.endDate || bSub.endDate > new Date());
    if (aIsPremium && !bIsPremium) return -1;
    if (!aIsPremium && bIsPremium) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    reviews: sorted.map((r: any) => formatReview(r)),
    nextCursor,
  };
};

// =============================================================================
// PARTY REVIEWS
// =============================================================================

// -----------------------------------------------------------------------------
// Create Review for a Party
// -----------------------------------------------------------------------------

export const createPartyReview = async (
  targetPartyId: string,
  authorId: string,
  data: CreateReviewRequest
): Promise<ReviewResponse> => {
  // Verify target party exists
  const targetParty = await prisma.party.findUnique({
    where: { id: targetPartyId },
    select: { id: true, deletedAt: true },
  });
  if (!targetParty || targetParty.deletedAt) throw new NotFoundError('Party');

  const review = await prisma.review.create({
    data: {
      authorId,
      targetPartyId,
      rating: data.rating,
      content: data.content,
    },
    include: reviewIncludes,
  });

  // Award points to target party in all races they compete in
  const { action, points } = getReviewPointAction(data.rating);
  const competitors = await prisma.raceCompetitor.findMany({
    where: { partyId: targetPartyId },
    select: { raceId: true },
  });

  await Promise.all(
    competitors.map((c) =>
      recordPointEvent({
        targetPartyId,
        raceId: c.raceId,
        action,
        points,
        sourceUserId: authorId,
      }).catch(() => {})
    )
  );

  return formatReview(review);
};

// -----------------------------------------------------------------------------
// Get Reviews for a Party
// -----------------------------------------------------------------------------

export const getPartyReviews = async (
  targetPartyId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ reviews: ReviewResponse[]; nextCursor: string | null }> => {
  // Verify target party exists
  const targetParty = await prisma.party.findUnique({
    where: { id: targetPartyId },
    select: { id: true, deletedAt: true },
  });
  if (!targetParty || targetParty.deletedAt) throw new NotFoundError('Party');

  const reviews = await prisma.review.findMany({
    where: { targetPartyId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: reviewIncludes,
  });

  const hasMore = reviews.length > limit;
  const results = hasMore ? reviews.slice(0, -1) : reviews;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // Sort premium authors' reviews first, then by createdAt desc
  const sorted = results.sort((a: any, b: any) => {
    const aSub = a.author.subscription;
    const bSub = b.author.subscription;
    const aIsPremium = aSub && (!aSub.endDate || aSub.endDate > new Date());
    const bIsPremium = bSub && (!bSub.endDate || bSub.endDate > new Date());
    if (aIsPremium && !bIsPremium) return -1;
    if (!aIsPremium && bIsPremium) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    reviews: sorted.map((r: any) => formatReview(r)),
    nextCursor,
  };
};

// =============================================================================
// REVIEW OPERATIONS
// =============================================================================

// -----------------------------------------------------------------------------
// Delete Review (author only)
// -----------------------------------------------------------------------------

export const deleteReview = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError('Review');
  if (review.authorId !== userId) {
    throw new ForbiddenError('You can only delete your own reviews');
  }

  await prisma.review.delete({ where: { id: reviewId } });
};

// -----------------------------------------------------------------------------
// Reply to a Review
// Only the target of the review (user or party admin) can reply
// -----------------------------------------------------------------------------

export const replyToReview = async (
  reviewId: string,
  userId: string,
  data: CreateReplyRequest
): Promise<ReviewReplyResponse> => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, targetUserId: true, targetPartyId: true },
  });
  if (!review) throw new NotFoundError('Review');

  // Check that the replier is the target of the review
  if (review.targetUserId) {
    // User review: only the target user can reply
    if (review.targetUserId !== userId) {
      throw new ForbiddenError('Only the reviewed user can reply to this review');
    }
  } else if (review.targetPartyId) {
    // Party review: only a party admin can reply
    const membership = await prisma.partyMembership.findUnique({
      where: { userId_partyId: { userId, partyId: review.targetPartyId } },
    });
    if (!membership || !membership.permissions.includes('admin')) {
      throw new ForbiddenError('Only party admins can reply to party reviews');
    }
  } else {
    throw new NotFoundError('Review');
  }

  const reply = await prisma.reviewReply.create({
    data: {
      reviewId,
      userId,
      content: data.content,
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return formatReply(reply);
};

// -----------------------------------------------------------------------------
// Delete Reply (reply author only)
// -----------------------------------------------------------------------------

export const deleteReply = async (
  reviewId: string,
  replyId: string,
  userId: string
): Promise<void> => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError('Review');

  const reply = await prisma.reviewReply.findUnique({ where: { id: replyId } });
  if (!reply || reply.reviewId !== reviewId) throw new NotFoundError('Reply');
  if (reply.userId !== userId) {
    throw new ForbiddenError('You can only delete your own replies');
  }

  await prisma.reviewReply.delete({ where: { id: replyId } });
};
