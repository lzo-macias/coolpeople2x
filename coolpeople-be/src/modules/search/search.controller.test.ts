import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('./search.service.js', () => ({
  search: vi.fn(),
}));

vi.mock('../../lib/response.js', () => ({
  sendSuccess: vi.fn(),
}));

import * as searchService from './search.service.js';
import { sendSuccess } from '../../lib/response.js';
import { search } from './search.controller.js';

const mockService = vi.mocked(searchService);
const mockSendSuccess = vi.mocked(sendSuccess);

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

describe('Search Controller', () => {
  // ---------------------------------------------------------------------------
  // search
  // ---------------------------------------------------------------------------

  describe('search', () => {
    it('calls service with q, type, parsed limit, and userId', async () => {
      const req = makeReq({ query: { q: 'test', type: 'user', limit: '5' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockService.search).toHaveBeenCalledOnce();
      expect(mockService.search).toHaveBeenCalledWith('test', 'user', 5, 'u1');
    });

    it('defaults limit to 10 when not provided', async () => {
      const req = makeReq({ query: { q: 'hello' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockService.search).toHaveBeenCalledWith('hello', undefined, 10, 'u1');
    });

    it('defaults limit to 10 when limit is not a valid number', async () => {
      const req = makeReq({ query: { q: 'hello', limit: 'bad' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockService.search).toHaveBeenCalledWith('hello', undefined, 10, 'u1');
    });

    it('passes undefined type when not provided', async () => {
      const req = makeReq({ query: { q: 'search-term', limit: '15' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockService.search).toHaveBeenCalledWith('search-term', undefined, 15, 'u1');
    });

    it('passes undefined userId when user is not authenticated', async () => {
      const req = makeReq({ user: undefined, query: { q: 'open', limit: '10' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockService.search).toHaveBeenCalledWith('open', undefined, 10, undefined);
    });

    it('calls sendSuccess with the search results', async () => {
      const req = makeReq({ query: { q: 'test' } });
      const res = makeRes();
      const fakeResults = [{ id: '1', name: 'Test User' }];
      mockService.search.mockResolvedValue(fakeResults);

      await search(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledOnce();
      expect(mockSendSuccess).toHaveBeenCalledWith(res, fakeResults);
    });

    it('calls sendSuccess with empty array when no results', async () => {
      const req = makeReq({ query: { q: 'nonexistent' } });
      const res = makeRes();
      mockService.search.mockResolvedValue([]);

      await search(req as any, res as any);

      expect(mockSendSuccess).toHaveBeenCalledWith(res, []);
    });
  });
});
