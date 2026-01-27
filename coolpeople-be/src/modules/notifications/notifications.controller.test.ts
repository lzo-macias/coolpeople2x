import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('./notifications.service.js', () => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
}));

vi.mock('../../lib/response.js', () => ({
  sendSuccess: vi.fn(),
  sendNoContent: vi.fn(),
  sendPaginated: vi.fn(),
}));

import * as notificationsService from './notifications.service.js';
import { sendSuccess, sendPaginated } from '../../lib/response.js';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from './notifications.controller.js';

const mockService = vi.mocked(notificationsService);
const mockSendSuccess = vi.mocked(sendSuccess);
const mockSendPaginated = vi.mocked(sendPaginated);

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { userId: 'u1' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  send: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Notifications Controller', () => {
  // ---------------------------------------------------------------------------
  // getNotifications
  // ---------------------------------------------------------------------------

  describe('getNotifications', () => {
    it('calls service with userId, cursor, and default limit', async () => {
      const req = makeReq({ query: {} });
      const res = makeRes();
      mockService.getNotifications.mockResolvedValue({
        notifications: [],
        nextCursor: null,
      });

      await getNotifications(req as any, res as any);

      expect(mockService.getNotifications).toHaveBeenCalledOnce();
      expect(mockService.getNotifications).toHaveBeenCalledWith('u1', undefined, 20);
    });

    it('passes cursor and parsed limit from query', async () => {
      const req = makeReq({ query: { cursor: 'abc123', limit: '5' } });
      const res = makeRes();
      mockService.getNotifications.mockResolvedValue({
        notifications: [],
        nextCursor: null,
      });

      await getNotifications(req as any, res as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith('u1', 'abc123', 5);
    });

    it('defaults limit to 20 when limit is not a valid number', async () => {
      const req = makeReq({ query: { limit: 'invalid' } });
      const res = makeRes();
      mockService.getNotifications.mockResolvedValue({
        notifications: [],
        nextCursor: null,
      });

      await getNotifications(req as any, res as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith('u1', undefined, 20);
    });

    it('calls sendPaginated with notifications and pagination meta', async () => {
      const req = makeReq({ query: {} });
      const res = makeRes();
      const fakeNotifs = [{ id: 'n1' }, { id: 'n2' }];
      mockService.getNotifications.mockResolvedValue({
        notifications: fakeNotifs,
        nextCursor: 'n2',
      });

      await getNotifications(req as any, res as any);

      expect(mockSendPaginated).toHaveBeenCalledOnce();
      expect(mockSendPaginated).toHaveBeenCalledWith(res, fakeNotifs, {
        cursor: 'n2',
        hasMore: true,
      });
    });

    it('sets hasMore to false and cursor to undefined when nextCursor is null', async () => {
      const req = makeReq({ query: {} });
      const res = makeRes();
      mockService.getNotifications.mockResolvedValue({
        notifications: [{ id: 'n1' }],
        nextCursor: null,
      });

      await getNotifications(req as any, res as any);

      expect(mockSendPaginated).toHaveBeenCalledWith(res, [{ id: 'n1' }], {
        cursor: undefined,
        hasMore: false,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------------------

  describe('markAsRead', () => {
    it('calls service with notification id and userId', async () => {
      const req = makeReq({ params: { id: 'n1' } });
      const res = makeRes();
      mockService.markAsRead.mockResolvedValue(undefined as any);

      await markAsRead(req as any, res as any);

      expect(mockService.markAsRead).toHaveBeenCalledOnce();
      expect(mockService.markAsRead).toHaveBeenCalledWith('n1', 'u1');
    });

    it('calls sendSuccess with { read: true }', async () => {
      const req = makeReq({ params: { id: 'n1' } });
      const res = makeRes();
      mockService.markAsRead.mockResolvedValue(undefined as any);

      await markAsRead(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledOnce();
      expect(mockSendSuccess).toHaveBeenCalledWith(res, { read: true });
    });
  });

  // ---------------------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------------------

  describe('markAllAsRead', () => {
    it('calls service with userId', async () => {
      const req = makeReq();
      const res = makeRes();
      mockService.markAllAsRead.mockResolvedValue(undefined as any);

      await markAllAsRead(req as any, res as any);

      expect(mockService.markAllAsRead).toHaveBeenCalledOnce();
      expect(mockService.markAllAsRead).toHaveBeenCalledWith('u1');
    });

    it('calls sendSuccess with { read: true }', async () => {
      const req = makeReq();
      const res = makeRes();
      mockService.markAllAsRead.mockResolvedValue(undefined as any);

      await markAllAsRead(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledOnce();
      expect(mockSendSuccess).toHaveBeenCalledWith(res, { read: true });
    });
  });

  // ---------------------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------------------

  describe('getUnreadCount', () => {
    it('calls service with userId', async () => {
      const req = makeReq();
      const res = makeRes();
      mockService.getUnreadCount.mockResolvedValue(3);

      await getUnreadCount(req as any, res as any);

      expect(mockService.getUnreadCount).toHaveBeenCalledOnce();
      expect(mockService.getUnreadCount).toHaveBeenCalledWith('u1');
    });

    it('calls sendSuccess with { unreadCount: count }', async () => {
      const req = makeReq();
      const res = makeRes();
      mockService.getUnreadCount.mockResolvedValue(7);

      await getUnreadCount(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledOnce();
      expect(mockSendSuccess).toHaveBeenCalledWith(res, { unreadCount: 7 });
    });

    it('returns zero count correctly', async () => {
      const req = makeReq();
      const res = makeRes();
      mockService.getUnreadCount.mockResolvedValue(0);

      await getUnreadCount(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledWith(res, { unreadCount: 0 });
    });
  });
});
