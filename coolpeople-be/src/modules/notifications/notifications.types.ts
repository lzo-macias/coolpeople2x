/**
 * Notifications Module Types
 */

// -----------------------------------------------------------------------------
// Notification Response
// -----------------------------------------------------------------------------

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  readAt: Date | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Create Notification Params (internal)
// -----------------------------------------------------------------------------

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
