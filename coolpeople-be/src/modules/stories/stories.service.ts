/**
 * Stories Service
 * Business logic for story management (24-hour ephemeral content)
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import type { StoryResponse, StoryFeedGroup, CreateStoryRequest } from './stories.types.js';

// -----------------------------------------------------------------------------
// Helper: Format story for API response
// -----------------------------------------------------------------------------

const formatStory = (story: any, viewerId?: string): StoryResponse => {
  return {
    id: story.id,
    user: {
      id: story.user.id,
      username: story.user.username,
      displayName: story.user.displayName,
      avatarUrl: story.user.avatarUrl,
    },
    videoUrl: story.videoUrl,
    thumbnailUrl: story.thumbnailUrl,
    duration: story.duration,
    viewCount: story._count?.views ?? 0,
    isViewed: viewerId
      ? story.views?.some((v: any) => v.userId === viewerId)
      : undefined,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
  };
};

// Story includes
const storyIncludes = (viewerId?: string) => ({
  user: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  _count: { select: { views: true } },
  ...(viewerId && {
    views: { where: { userId: viewerId }, take: 1 },
  }),
});

// -----------------------------------------------------------------------------
// Create Story
// -----------------------------------------------------------------------------

export const createStory = async (
  userId: string,
  data: CreateStoryRequest
): Promise<StoryResponse> => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const story = await prisma.story.create({
    data: {
      userId,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,
      expiresAt,
    },
    include: storyIncludes(userId),
  });

  return formatStory(story, userId);
};

// -----------------------------------------------------------------------------
// Get Story by ID
// -----------------------------------------------------------------------------

export const getStory = async (
  storyId: string,
  viewerId?: string
): Promise<StoryResponse> => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: storyIncludes(viewerId),
  });

  if (!story || story.deletedAt || story.expiresAt < new Date()) {
    throw new NotFoundError('Story');
  }

  return formatStory(story, viewerId);
};

// -----------------------------------------------------------------------------
// Delete Story (soft delete)
// -----------------------------------------------------------------------------

export const deleteStory = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.deletedAt) throw new NotFoundError('Story');
  if (story.userId !== userId) throw new ForbiddenError('You can only delete your own stories');

  await prisma.story.update({
    where: { id: storyId },
    data: { deletedAt: new Date() },
  });
};

// -----------------------------------------------------------------------------
// Get Story Feed (stories from users you follow, grouped by user)
// -----------------------------------------------------------------------------

export const getStoryFeed = async (
  userId: string
): Promise<StoryFeedGroup[]> => {
  const now = new Date();

  // Get all active stories from followed users
  const stories = await prisma.story.findMany({
    where: {
      deletedAt: null,
      expiresAt: { gt: now },
      user: {
        followers: {
          some: { followerId: userId },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: storyIncludes(userId),
  });

  // Group by user
  const grouped = new Map<string, { user: any; stories: any[]; hasUnviewed: boolean }>();

  for (const story of stories) {
    const uid = story.user.id;
    if (!grouped.has(uid)) {
      grouped.set(uid, {
        user: story.user,
        stories: [],
        hasUnviewed: false,
      });
    }
    const group = grouped.get(uid)!;
    const formatted = formatStory(story, userId);
    group.stories.push(formatted);
    if (!formatted.isViewed) {
      group.hasUnviewed = true;
    }
  }

  // Sort: unviewed groups first, then by most recent story
  const result = Array.from(grouped.values());
  result.sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return 0;
  });

  return result;
};

// -----------------------------------------------------------------------------
// Get User Stories (active, non-expired)
// -----------------------------------------------------------------------------

export const getUserStories = async (
  targetUserId: string,
  viewerId?: string
): Promise<StoryResponse[]> => {
  const now = new Date();

  const stories = await prisma.story.findMany({
    where: {
      userId: targetUserId,
      deletedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'asc' },
    include: storyIncludes(viewerId),
  });

  return stories.map((s) => formatStory(s, viewerId));
};

// -----------------------------------------------------------------------------
// Mark Story as Viewed
// -----------------------------------------------------------------------------

export const viewStory = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.deletedAt || story.expiresAt < new Date()) {
    throw new NotFoundError('Story');
  }

  // Upsert view (idempotent)
  await prisma.storyView.upsert({
    where: { storyId_userId: { storyId, userId } },
    create: { storyId, userId },
    update: {},
  });
};

// -----------------------------------------------------------------------------
// Expire Stories (called by cron job)
// Soft-deletes stories past their expiration
// -----------------------------------------------------------------------------

export const expireStories = async (): Promise<number> => {
  const now = new Date();

  const result = await prisma.story.updateMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  return result.count;
};
