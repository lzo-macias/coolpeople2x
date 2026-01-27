import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findMany: vi.fn() },
    party: { findMany: vi.fn() },
    race: { findMany: vi.fn() },
    reel: { findMany: vi.fn() },
    hashtag: { findMany: vi.fn() },
    block: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../lib/prisma.js';
import { search } from './search.service.js';

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  // Default all to empty results
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.party.findMany.mockResolvedValue([]);
  mockPrisma.race.findMany.mockResolvedValue([]);
  mockPrisma.reel.findMany.mockResolvedValue([]);
  mockPrisma.hashtag.findMany.mockResolvedValue([]);
  mockPrisma.block.findMany.mockResolvedValue([]);
});

describe('Search Service', () => {
  // ---------------------------------------------------------------------------
  // Full search (all entity types)
  // ---------------------------------------------------------------------------

  it('searches all entity types when no type filter given', async () => {
    const result = await search('test', undefined, 10);

    expect(mockPrisma.user.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.party.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.race.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.reel.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.hashtag.findMany).toHaveBeenCalledOnce();
    expect(result).toEqual({
      users: [],
      parties: [],
      races: [],
      reels: [],
      hashtags: [],
    });
  });

  // ---------------------------------------------------------------------------
  // Type-filtered search
  // ---------------------------------------------------------------------------

  it('searches only users when type=users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'testuser', displayName: 'Test', avatarUrl: null, userType: 'CANDIDATE' },
    ] as any);

    const result = await search('test', 'users', 10);

    expect(mockPrisma.user.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.party.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.race.findMany).not.toHaveBeenCalled();
    expect(result.users).toHaveLength(1);
    expect(result.users[0].username).toBe('testuser');
    expect(result.parties).toEqual([]);
  });

  it('searches only parties when type=parties', async () => {
    mockPrisma.party.findMany.mockResolvedValue([
      { id: 'p1', name: 'Test Party', handle: 'testparty', description: null, avatarUrl: null },
    ] as any);

    const result = await search('test', 'parties', 10);

    expect(mockPrisma.party.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(result.parties).toHaveLength(1);
    expect(result.parties[0].name).toBe('Test Party');
  });

  it('searches only races when type=races', async () => {
    mockPrisma.race.findMany.mockResolvedValue([
      { id: 'r1', title: 'Test Race', description: null, raceType: 'CANDIDATE_VS_CANDIDATE' },
    ] as any);

    const result = await search('test', 'races', 10);

    expect(mockPrisma.race.findMany).toHaveBeenCalledOnce();
    expect(result.races).toHaveLength(1);
  });

  it('searches only hashtags when type=hashtags', async () => {
    mockPrisma.hashtag.findMany.mockResolvedValue([
      { id: 'h1', name: 'testing', _count: { reels: 42 } },
    ] as any);

    const result = await search('test', 'hashtags', 10);

    expect(mockPrisma.hashtag.findMany).toHaveBeenCalledOnce();
    expect(result.hashtags).toHaveLength(1);
    expect(result.hashtags[0]).toEqual({ id: 'h1', name: 'testing', reelCount: 42 });
  });

  it('searches only reels when type=reels', async () => {
    mockPrisma.reel.findMany.mockResolvedValue([
      {
        id: 'reel1',
        title: 'Test reel',
        description: null,
        thumbnailUrl: null,
        user: { id: 'u1', username: 'creator' },
      },
    ] as any);

    const result = await search('test', 'reels', 10);

    expect(mockPrisma.reel.findMany).toHaveBeenCalledOnce();
    expect(result.reels).toHaveLength(1);
    expect(result.reels[0].creator.username).toBe('creator');
  });

  // ---------------------------------------------------------------------------
  // Block filtering
  // ---------------------------------------------------------------------------

  it('excludes blocked users from search results when viewer is authenticated', async () => {
    mockPrisma.block.findMany.mockResolvedValue([
      { blockerId: 'viewer1', blockedId: 'blocked-user' },
    ] as any);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await search('test', 'users', 10, 'viewer1');

    expect(mockPrisma.block.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ blockerId: 'viewer1' }, { blockedId: 'viewer1' }],
      },
      select: { blockerId: true, blockedId: true },
    });

    // User query should include notIn filter for blocked users
    const userCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(userCall?.where).toHaveProperty('id');
  });

  it('does not query blocks when no viewer', async () => {
    await search('test', 'users', 10);

    expect(mockPrisma.block.findMany).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Limit parameter
  // ---------------------------------------------------------------------------

  it('passes limit to each entity query', async () => {
    await search('test', 'users', 5);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});
