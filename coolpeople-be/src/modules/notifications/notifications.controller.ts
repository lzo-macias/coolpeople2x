/**
 * Notifications Controller
 * HTTP request handlers for notification management
 */

import type { Request, Response } from 'express';
import * as notificationsService from './notifications.service.js';
import { sendSuccess, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/notifications - List notifications
// -----------------------------------------------------------------------------

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await notificationsService.getNotifications(
    req.user!.userId,
    cursor,
    parseInt(limit) || 20
  );

  sendPaginated(res, result.notifications, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/notifications/:id/read - Mark one as read
// -----------------------------------------------------------------------------

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await notificationsService.markAsRead(id, req.user!.userId);
  sendSuccess(res, { read: true });
};

// -----------------------------------------------------------------------------
// POST /api/notifications/read-all - Mark all as read
// -----------------------------------------------------------------------------

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  await notificationsService.markAllAsRead(req.user!.userId);
  sendSuccess(res, { read: true });
};

// -----------------------------------------------------------------------------
// GET /api/notifications/unread-count - Get unread count
// -----------------------------------------------------------------------------

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const count = await notificationsService.getUnreadCount(req.user!.userId);
  sendSuccess(res, { unreadCount: count });
};
