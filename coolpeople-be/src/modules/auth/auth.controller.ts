/**
 * Auth Controller
 * HTTP request handlers for authentication
 */

import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { sendSuccess, sendCreated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/auth/register
// -----------------------------------------------------------------------------

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body);
  sendCreated(res, result);
};

// -----------------------------------------------------------------------------
// POST /api/auth/login
// -----------------------------------------------------------------------------

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.login(req.body);
  sendSuccess(res, result);
};

// -----------------------------------------------------------------------------
// GET /api/auth/me
// -----------------------------------------------------------------------------

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getCurrentUser(req.user!.userId);
  sendSuccess(res, { user });
};

// -----------------------------------------------------------------------------
// POST /api/auth/google
// -----------------------------------------------------------------------------

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;
  const result = await authService.googleAuth(idToken);
  sendSuccess(res, result);
};

// -----------------------------------------------------------------------------
// POST /api/auth/apple
// -----------------------------------------------------------------------------

export const appleAuth = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;
  const result = await authService.appleAuth(idToken);
  sendSuccess(res, result);
};
