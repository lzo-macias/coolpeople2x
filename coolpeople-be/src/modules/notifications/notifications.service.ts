/**
 * Notifications Service
 * Business logic for notification CRUD and WebSocket emission
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError } from '../../lib/errors.js';
import type { NotificationResponse, CreateNotificationParams } from './notifications.types.js';

// -----------------------------------------------------------------------------
// Create Notification
// Inserts into DB and emits via WebSocket to user's room
// -----------------------------------------------------------------------------

export const createNotification = async (
  params: CreateNotificationParams
): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    });

    // Emit via WebSocket
    const io = getIO();
    if (io) {
      io.to(`user:${params.userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      });
    }
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('Failed to create notification:', (err as Error).message);
  }
};

// -----------------------------------------------------------------------------
// Get Notifications (paginated, cursor-based)
// -----------------------------------------------------------------------------

export const getNotifications = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ notifications: NotificationResponse[]; nextCursor: string | null }> => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = notifications.length > limit;
  const results = hasMore ? notifications.slice(0, -1) : notifications;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    notifications: results.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Mark Single Notification as Read
// -----------------------------------------------------------------------------

export const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new NotFoundError('Notification');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

// -----------------------------------------------------------------------------
// Mark All as Read
// -----------------------------------------------------------------------------

export const markAllAsRead = async (userId: string): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

// -----------------------------------------------------------------------------
// Get Unread Count
// -----------------------------------------------------------------------------

export const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
};
