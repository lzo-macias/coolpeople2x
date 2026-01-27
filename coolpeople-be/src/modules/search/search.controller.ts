/**
 * Search Controller
 * HTTP request handlers for search
 */

import type { Request, Response } from 'express';
import * as searchService from './search.service.js';
import { sendSuccess } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/search - Search across entities
// -----------------------------------------------------------------------------

export const search = async (req: Request, res: Response): Promise<void> => {
  const { q, type, limit } = req.query as {
    q: string;
    type?: string;
    limit: string;
  };

  const results = await searchService.search(
    q,
    type,
    parseInt(limit) || 10,
    req.user?.userId
  );

  sendSuccess(res, results);
};
