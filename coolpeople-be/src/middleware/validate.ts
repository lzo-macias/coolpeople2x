/**
 * Request Validation Middleware
 * Uses Zod schemas to validate request body, params, and query
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodObject } from 'zod';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ValidationSchema = ZodObject<{
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}>;

// -----------------------------------------------------------------------------
// Validation Middleware Factory
// Accepts a Zod object schema with body, params, and/or query properties
// -----------------------------------------------------------------------------

export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Parse the full request shape
    const result = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // Apply validated data back to request
    if (result.body) req.body = result.body;
    if (result.params) req.params = result.params as typeof req.params;
    // Express 5 makes req.query read-only, so use Object.defineProperty
    if (result.query) {
      Object.defineProperty(req, 'query', {
        value: result.query as typeof req.query,
        writable: true,
        configurable: true,
      });
    }

    next();
  };
};

// -----------------------------------------------------------------------------
// Common Validation Schemas
// Reusable schemas for common patterns
// -----------------------------------------------------------------------------

export const commonSchemas = {
  // UUID parameter
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Pagination query params
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  // Cursor-based pagination (for feeds)
  cursorPagination: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};
