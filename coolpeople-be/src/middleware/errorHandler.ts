/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */

import type { Request, Response, NextFunction } from 'express';
import { isAppError, ValidationError } from '../lib/errors.js';
import { isDev } from '../config/env.js';
import { ZodError } from 'zod';

// -----------------------------------------------------------------------------
// Error Response Interface
// -----------------------------------------------------------------------------

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
    stack?: string;
  };
}

// -----------------------------------------------------------------------------
// Prisma Error Type Guard
// -----------------------------------------------------------------------------

interface PrismaError {
  code: string;
  meta?: { target?: string[] };
}

const isPrismaError = (error: unknown): error is PrismaError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string'
  );
};

// -----------------------------------------------------------------------------
// Error Handler
// -----------------------------------------------------------------------------

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (isDev) {
    console.error('Error:', err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(e.message);
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: fieldErrors,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle our custom AppErrors
  if (isAppError(err)) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
        ...(isDev && { stack: err.stack }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError' && isPrismaError(err)) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const field = err.meta?.target?.[0] ?? 'field';
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${field} already exists`,
        },
      };
      res.status(409).json(response);
      return;
    }

    if (err.code === 'P2025') {
      // Record not found
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      };
      res.status(404).json(response);
      return;
    }
  }

  // Default: Internal server error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
      ...(isDev && { stack: err.stack }),
    },
  };
  res.status(500).json(response);
};

// -----------------------------------------------------------------------------
// 404 Handler
// -----------------------------------------------------------------------------

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };
  res.status(404).json(response);
};
