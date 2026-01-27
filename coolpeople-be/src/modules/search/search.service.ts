/**
 * Search Service
 * Business logic for cross-entity search using ILIKE
 */

import { prisma } from '../../lib/prisma.js';
import type {
  SearchResults,
  SearchUserResult,
  SearchPartyResult,
  SearchRaceResult,
  SearchReelResult,
  SearchHashtagResult,
} from './search.types.js';

// -----------------------------------------------------------------------------
// Search across entities
// -----------------------------------------------------------------------------

export const search = async (
  query: string,
  type?: string,
  limit: number = 10,
  viewerId?: string
): Promise<SearchResults> => {
  const results: SearchResults = {
    users: [],
    parties: [],
    races: [],
    reels: [],
    hashtags: [],
  };

  // Get blocked user IDs if viewer is authenticated
  let blockedIds: string[] = [];
  if (viewerId) {
    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    blockedIds = blocks.map((b) =>
      b.blockerId === viewerId ? b.blockedId : b.blockerId
    );
  }

  const shouldSearch = (entityType: string) => !type || type === entityType;

  // Run searches in parallel
  const promises: Promise<void>[] = [];

  if (shouldSearch('users')) {
    promises.push(
      searchUsers(query, limit, blockedIds).then((r) => { results.users = r; })
    );
  }

  if (shouldSearch('parties')) {
    promises.push(
      searchParties(query, limit).then((r) => { results.parties = r; })
    );
  }

  if (shouldSearch('races')) {
    promises.push(
      searchRaces(query, limit).then((r) => { results.races = r; })
    );
  }

  if (shouldSearch('reels')) {
    promises.push(
      searchReels(query, limit, blockedIds).then((r) => { results.reels = r; })
    );
  }

  if (shouldSearch('hashtags')) {
    promises.push(
      searchHashtags(query, limit).then((r) => { results.hashtags = r; })
    );
  }

  await Promise.all(promises);

  return results;
};

// -----------------------------------------------------------------------------
// Individual entity searches
// -----------------------------------------------------------------------------

const searchUsers = async (
  query: string,
  limit: number,
  blockedIds: string[]
): Promise<SearchUserResult[]> => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ],
      ...(blockedIds.length > 0 && { id: { notIn: blockedIds } }),
    },
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      userType: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return users;
};

const searchParties = async (
  query: string,
  limit: number
): Promise<SearchPartyResult[]> => {
  const parties = await prisma.party.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      name: true,
      handle: true,
      description: true,
      avatarUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return parties;
};

const searchRaces = async (
  query: string,
  limit: number
): Promise<SearchRaceResult[]> => {
  const races = await prisma.race.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      raceType: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return races;
};

const searchReels = async (
  query: string,
  limit: number,
  blockedIds: string[]
): Promise<SearchReelResult[]> => {
  const reels = await prisma.reel.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      ...(blockedIds.length > 0 && { userId: { notIn: blockedIds } }),
    },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      user: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reels.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    thumbnailUrl: r.thumbnailUrl,
    creator: r.user,
  }));
};

const searchHashtags = async (
  query: string,
  limit: number
): Promise<SearchHashtagResult[]> => {
  const hashtags = await prisma.hashtag.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' },
    },
    take: limit,
    select: {
      id: true,
      name: true,
      _count: { select: { reels: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return hashtags.map((h) => ({
    id: h.id,
    name: h.name,
    reelCount: h._count.reels,
  }));
};
