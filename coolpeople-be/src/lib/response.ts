/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

import type { Response } from 'express';

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    cursor?: string;
  };
}

interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  cursor?: string;
}

// -----------------------------------------------------------------------------
// Response Helpers
// -----------------------------------------------------------------------------

/**
 * Send a successful response with data
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Send a paginated list response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta
): void => {
  sendSuccess(res, data, 200, meta);
};
