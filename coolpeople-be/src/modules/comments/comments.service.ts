/**
 * Comments Service
 * Business logic for comment management
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { CommentResponse, CreateCommentRequest } from './comments.types.js';

// -----------------------------------------------------------------------------
// Helper: Format comment for API response
// -----------------------------------------------------------------------------

const formatComment = (comment: any, viewerId?: string): CommentResponse => {
  return {
    id: comment.id,
    user: {
      id: comment.user.id,
      username: comment.user.username,
      displayName: comment.user.displayName,
      avatarUrl: comment.user.avatarUrl,
    },
    reelId: comment.reelId,
    content: comment.content,
    parentId: comment.parentId,
    likeCount: comment._count?.likes ?? 0,
    isLiked: viewerId
      ? comment.likes?.some((l: any) => l.userId === viewerId)
      : undefined,
    replies: comment.replies?.map((r: any) => formatComment(r, viewerId)),
    createdAt: comment.createdAt,
  };
};

// -----------------------------------------------------------------------------
// Get Comments for a Reel
// Top-level comments with their replies (1 level deep)
// -----------------------------------------------------------------------------

export const getComments = async (
  reelId: string,
  viewerId?: string,
  cursor?: string,
  limit: number = 20
): Promise<{ comments: CommentResponse[]; nextCursor: string | null }> => {
  // Verify reel exists
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  const comments = await prisma.comment.findMany({
    where: {
      reelId,
      parentId: null, // Top-level only
      deletedAt: null,
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
      ...(viewerId && {
        likes: { where: { userId: viewerId }, take: 1 },
      }),
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          _count: { select: { likes: true } },
          ...(viewerId && {
            likes: { where: { userId: viewerId }, take: 1 },
          }),
        },
      },
    },
  });

  const hasMore = comments.length > limit;
  const results = hasMore ? comments.slice(0, -1) : comments;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    comments: results.map((c) => formatComment(c, viewerId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Create Comment
// -----------------------------------------------------------------------------

export const createComment = async (
  reelId: string,
  userId: string,
  data: CreateCommentRequest
): Promise<CommentResponse> => {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel || reel.deletedAt) throw new NotFoundError('Reel');

  // If replying, verify parent exists and is a top-level comment (1 level deep max)
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
    if (!parent || parent.deletedAt) throw new NotFoundError('Parent comment');
    if (parent.reelId !== reelId) throw new ForbiddenError('Parent comment belongs to different reel');
    if (parent.parentId) throw new ForbiddenError('Cannot reply to a reply (1 level deep max)');
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        userId,
        reelId,
        content: data.content,
        parentId: data.parentId,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true } },
      },
    }),
    prisma.reel.update({
      where: { id: reelId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  // Update affinity (comment = +3)
  if (reel.userId !== userId) {
    prisma.userAffinity
      .upsert({
        where: { userId_targetUserId: { userId, targetUserId: reel.userId } },
        update: { score: { increment: 3 } },
        create: { userId, targetUserId: reel.userId, score: 3 },
      })
      .catch(() => {});

    // Notification for reel creator
    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    createNotification({
      userId: reel.userId,
      type: 'COMMENT',
      title: 'New comment',
      body: `${commenter?.username ?? 'Someone'} commented on your reel`,
      data: { reelId, commentId: comment.id },
    }).catch(() => {});
  }

  return formatComment(comment, userId);
};

// -----------------------------------------------------------------------------
// Delete Comment (soft delete)
// -----------------------------------------------------------------------------

export const deleteComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.deletedAt) throw new NotFoundError('Comment');
  if (comment.userId !== userId) throw new ForbiddenError('You can only delete your own comments');

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    }),
    prisma.reel.update({
      where: { id: comment.reelId },
      data: { commentCount: { decrement: 1 } },
    }),
  ]);
};

// -----------------------------------------------------------------------------
// Like Comment
// -----------------------------------------------------------------------------

export const likeComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.deletedAt) throw new NotFoundError('Comment');

  try {
    await prisma.commentLike.create({
      data: { userId, commentId },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already liked');
    throw err;
  }
};

// -----------------------------------------------------------------------------
// Unlike Comment
// -----------------------------------------------------------------------------

export const unlikeComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });
  if (!existing) throw new NotFoundError('Comment like');

  await prisma.commentLike.delete({ where: { id: existing.id } });
};
