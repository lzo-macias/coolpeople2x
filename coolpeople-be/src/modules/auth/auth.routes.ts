/**
 * Auth Routes
 * /api/auth/*
 */

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { registerSchema, loginSchema, oauthSchema } from './auth.schemas.js';

const router = Router();

// -----------------------------------------------------------------------------
// Public Routes
// -----------------------------------------------------------------------------

// POST /api/auth/register - Create new account
router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login - Login with email/password
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

// POST /api/auth/google - Login/register with Google
router.post(
  '/google',
  validate(oauthSchema),
  authController.googleAuth
);

// POST /api/auth/apple - Login/register with Apple
router.post(
  '/apple',
  validate(oauthSchema),
  authController.appleAuth
);

// -----------------------------------------------------------------------------
// Protected Routes
// -----------------------------------------------------------------------------

// GET /api/auth/me - Get current user
router.get(
  '/me',
  requireAuth,
  authController.me
);

export default router;
