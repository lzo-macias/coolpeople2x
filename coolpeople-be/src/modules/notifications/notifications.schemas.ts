/**
 * Notifications Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Notification ID Param
// -----------------------------------------------------------------------------

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

// -----------------------------------------------------------------------------
// List Notifications Query
// -----------------------------------------------------------------------------

export const listNotificationsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
