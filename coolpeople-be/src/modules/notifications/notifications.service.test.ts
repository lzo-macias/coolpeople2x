import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../lib/socket.js', () => ({
  getIO: vi.fn(),
}));

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './notifications.service.js';

const mockPrisma = vi.mocked(prisma);
const mockGetIO = vi.mocked(getIO);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Notifications Service', () => {
  // ---------------------------------------------------------------------------
  // createNotification
  // ---------------------------------------------------------------------------

  describe('createNotification', () => {
    it('creates a notification record in the database', async () => {
      const fakeNotif = {
        id: 'n1',
        userId: 'u1',
        type: 'FOLLOW',
        title: 'New follower',
        body: 'Alice followed you',
        data: null,
        readAt: null,
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(fakeNotif as any);
      mockGetIO.mockReturnValue(null);

      await createNotification({
        userId: 'u1',
        type: 'FOLLOW',
        title: 'New follower',
        body: 'Alice followed you',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledOnce();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'FOLLOW',
          title: 'New follower',
          body: 'Alice followed you',
        }),
      });
    });

    it('emits via WebSocket when IO is available', async () => {
      const fakeNotif = {
        id: 'n1',
        userId: 'u1',
        type: 'LIKE',
        title: 'New like',
        body: 'Bob liked your reel',
        data: null,
        readAt: null,
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(fakeNotif as any);

      const emitMock = vi.fn();
      const toMock = vi.fn().mockReturnValue({ emit: emitMock });
      mockGetIO.mockReturnValue({ to: toMock } as any);

      await createNotification({
        userId: 'u1',
        type: 'LIKE',
        title: 'New like',
        body: 'Bob liked your reel',
      });

      expect(toMock).toHaveBeenCalledWith('user:u1');
      expect(emitMock).toHaveBeenCalledWith('notification', expect.objectContaining({
        id: 'n1',
        type: 'LIKE',
      }));
    });

    it('does not throw when DB create fails (fire-and-forget)', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        createNotification({
          userId: 'u1',
          type: 'FOLLOW',
          title: 'test',
          body: 'test',
        })
      ).resolves.toBeUndefined();
    });

    it('serializes data field to JSON string', async () => {
      const fakeNotif = {
        id: 'n2',
        userId: 'u1',
        type: 'NOMINATION',
        title: 'Nominated!',
        body: 'You were nominated',
        data: '{"raceId":"r1"}',
        readAt: null,
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(fakeNotif as any);
      mockGetIO.mockReturnValue(null);

      await createNotification({
        userId: 'u1',
        type: 'NOMINATION',
        title: 'Nominated!',
        body: 'You were nominated',
        data: { raceId: 'r1' },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: '{"raceId":"r1"}',
        }),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getNotifications
  // ---------------------------------------------------------------------------

  describe('getNotifications', () => {
    it('returns paginated notifications', async () => {
      const fakeNotifs = [
        { id: 'n1', type: 'FOLLOW', title: 'T1', body: 'B1', data: null, readAt: null, createdAt: new Date() },
        { id: 'n2', type: 'LIKE', title: 'T2', body: 'B2', data: null, readAt: null, createdAt: new Date() },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(fakeNotifs as any);

      const result = await getNotifications('u1', undefined, 20);

      expect(result.notifications).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          take: 21,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('returns nextCursor when there are more results', async () => {
      // Return limit+1 results to indicate more
      const fakeNotifs = Array.from({ length: 3 }, (_, i) => ({
        id: `n${i}`,
        type: 'FOLLOW',
        title: `T${i}`,
        body: `B${i}`,
        data: null,
        readAt: null,
        createdAt: new Date(),
      }));
      mockPrisma.notification.findMany.mockResolvedValue(fakeNotifs as any);

      const result = await getNotifications('u1', undefined, 2);

      expect(result.notifications).toHaveLength(2);
      expect(result.nextCursor).toBe('n1');
    });
  });

  // ---------------------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------------------

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
      } as any);
      mockPrisma.notification.update.mockResolvedValue({} as any);

      await markAsRead('n1', 'u1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('throws NotFoundError for non-existent notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(markAsRead('bad-id', 'u1')).rejects.toThrow('Notification not found');
    });

    it('throws NotFoundError when user does not own notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'other-user',
      } as any);

      await expect(markAsRead('n1', 'u1')).rejects.toThrow('Notification not found');
    });
  });

  // ---------------------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------------------

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 } as any);

      await markAllAsRead('u1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------------------

  describe('getUnreadCount', () => {
    it('returns unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const count = await getUnreadCount('u1');

      expect(count).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'u1', readAt: null },
      });
    });
  });
});
