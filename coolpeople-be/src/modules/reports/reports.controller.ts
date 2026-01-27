/**
 * Reports Controller
 * HTTP request handlers for report management
 */

import type { Request, Response } from 'express';
import * as reportsService from './reports.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response.js';
import type { ReportStatus } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// POST /api/reports
// -----------------------------------------------------------------------------

export const createReport = async (req: Request, res: Response): Promise<void> => {
  const report = await reportsService.createReport(
    req.user!.userId,
    req.body
  );
  sendCreated(res, { report });
};

// -----------------------------------------------------------------------------
// GET /api/reports
// TODO: Add admin role check once role system is implemented
// -----------------------------------------------------------------------------

export const listReports = async (req: Request, res: Response): Promise<void> => {
  const { status, cursor, limit } = req.query as {
    status?: ReportStatus;
    cursor?: string;
    limit: string;
  };
  const result = await reportsService.listReports(
    status,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.reports, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// PATCH /api/reports/:id
// TODO: Add admin role check once role system is implemented
// -----------------------------------------------------------------------------

export const resolveReport = async (req: Request, res: Response): Promise<void> => {
  const reportId = req.params.id as string;
  const report = await reportsService.resolveReport(reportId, req.body);
  sendSuccess(res, { report });
};
