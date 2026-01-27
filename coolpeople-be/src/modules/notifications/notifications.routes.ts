/**
 * Notifications Routes
 * /api/notifications/*
 */

import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} from './notifications.schemas.js';

const router = Router();

// GET /api/notifications - List notifications (paginated)
router.get(
  '/',
  requireAuth,
  validate(listNotificationsQuerySchema),
  notificationsController.getNotifications
);

// GET /api/notifications/unread-count - Get unread count
router.get(
  '/unread-count',
  requireAuth,
  notificationsController.getUnreadCount
);

// POST /api/notifications/read-all - Mark all as read
router.post(
  '/read-all',
  requireAuth,
  notificationsController.markAllAsRead
);

// POST /api/notifications/:id/read - Mark one as read
router.post(
  '/:id/read',
  requireAuth,
  validate(notificationIdParamSchema),
  notificationsController.markAsRead
);

export default router;
