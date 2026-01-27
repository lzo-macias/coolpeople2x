/**
 * Search Routes
 * /api/search/*
 */

import { Router } from 'express';
import * as searchController from './search.controller.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/auth.js';
import { searchQuerySchema } from './search.schemas.js';

const router = Router();

// GET /api/search - Search across entities
router.get(
  '/',
  optionalAuth,
  validate(searchQuerySchema),
  searchController.search
);

export default router;
