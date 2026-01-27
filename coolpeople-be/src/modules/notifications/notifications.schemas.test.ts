import { describe, it, expect } from 'vitest';
import { notificationIdParamSchema, listNotificationsQuerySchema } from './notifications.schemas.js';

describe('Notification Schemas', () => {
  // ---------------------------------------------------------------------------
  // notificationIdParamSchema
  // ---------------------------------------------------------------------------

  describe('notificationIdParamSchema', () => {
    it('accepts a valid UUID in params.id', () => {
      const input = { params: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' } };
      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      }
    });

    it('rejects a non-UUID string', () => {
      const input = { params: { id: 'not-a-uuid' } };
      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid notification ID');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // listNotificationsQuerySchema
  // ---------------------------------------------------------------------------

  describe('listNotificationsQuerySchema', () => {
    it('accepts a valid query with cursor and limit', () => {
      const input = { query: { cursor: 'some-cursor-value', limit: 15 } };
      const result = listNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.cursor).toBe('some-cursor-value');
        expect(result.data.query.limit).toBe(15);
      }
    });

    it('uses default limit of 20 when limit is not provided', () => {
      const input = { query: {} };
      const result = listNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.limit).toBe(20);
      }
    });

    it('rejects limit greater than 50', () => {
      const input = { query: { limit: 51 } };
      const result = listNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('cursor is optional', () => {
      const input = { query: { limit: 10 } };
      const result = listNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.cursor).toBeUndefined();
      }
    });
  });
});
