/**
 * Reports Routes
 * /api/reports/*
 */

import { Router } from 'express';
import * as reportsController from './reports.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createReportSchema,
  reportIdParamSchema,
  listReportsQuerySchema,
  resolveReportSchema,
} from './reports.schemas.js';

export const reportsRouter = Router();

// -----------------------------------------------------------------------------
// POST /api/reports - Create a report
// -----------------------------------------------------------------------------

reportsRouter.post(
  '/',
  requireAuth,
  validate(createReportSchema),
  reportsController.createReport
);

// -----------------------------------------------------------------------------
// GET /api/reports - List reports (admin)
// TODO: Add admin role middleware once role system is implemented
// -----------------------------------------------------------------------------

reportsRouter.get(
  '/',
  requireAuth,
  validate(listReportsQuerySchema),
  reportsController.listReports
);

// -----------------------------------------------------------------------------
// PATCH /api/reports/:id - Resolve a report (admin)
// TODO: Add admin role middleware once role system is implemented
// -----------------------------------------------------------------------------

reportsRouter.patch(
  '/:id',
  requireAuth,
  validate(reportIdParamSchema),
  validate(resolveReportSchema),
  reportsController.resolveReport
);
