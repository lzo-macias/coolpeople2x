/**
 * Authentication Middleware
 * JWT verification and user context injection
 */

import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'PARTICIPANT' | 'CANDIDATE';
  iat: number;
  exp: number;
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// -----------------------------------------------------------------------------
// Token Utilities
// -----------------------------------------------------------------------------

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
};

// -----------------------------------------------------------------------------
// Middleware: Require Authentication
// Verifies JWT and attaches user to request
// -----------------------------------------------------------------------------

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
};

// -----------------------------------------------------------------------------
// Middleware: Optional Authentication
// Attaches user if valid token present, continues otherwise
// -----------------------------------------------------------------------------

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
  } catch {
    // Invalid token is fine for optional auth - just continue without user
  }

  next();
};

// -----------------------------------------------------------------------------
// Middleware: Require Candidate Status
// User must be authenticated AND be a candidate (not just participant)
// -----------------------------------------------------------------------------

export const requireCandidate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (req.user.userType !== 'CANDIDATE') {
    throw new ForbiddenError('Only candidates can perform this action');
  }

  next();
};
