/**
 * Auth Service
 * Business logic for authentication
 */

import { Buffer } from 'node:buffer';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { generateToken } from '../../middleware/auth.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../lib/errors.js';
import type { RegisterRequest, LoginRequest, SafeUser, AuthResponse } from './auth.types.js';
import type { User } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SALT_ROUNDS = 12;

// -----------------------------------------------------------------------------
// Helper: Strip sensitive fields from user
// -----------------------------------------------------------------------------

export const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  userType: user.userType,
  isVerified: user.isVerified,
  isFrozen: user.isFrozen,
  isPrivate: user.isPrivate,
  createdAt: user.createdAt,
});

// -----------------------------------------------------------------------------
// Register
// -----------------------------------------------------------------------------

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const { email, password, username, displayName } = data;

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new ConflictError('Email already registered');
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw new ConflictError('Username already taken');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      username,
      displayName,
      userType: 'PARTICIPANT', // New users start as participants
    },
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    userType: user.userType,
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const { email, password } = data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if user has a password (might be OAuth-only)
  if (!user.passwordHash) {
    throw new UnauthorizedError('Please login with your social account');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    userType: user.userType,
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

// -----------------------------------------------------------------------------
// Get Current User
// -----------------------------------------------------------------------------

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return toSafeUser(user);
};

// -----------------------------------------------------------------------------
// OAuth: Google
// -----------------------------------------------------------------------------

interface GooglePayload {
  sub: string;      // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export const googleAuth = async (idToken: string): Promise<AuthResponse> => {
  // In production, verify the token with Google's API
  // For now, we'll decode it (in production use google-auth-library)
  // This is a placeholder - implement proper verification

  // Decode the JWT payload (without verification for dev)
  // In production: use OAuth2Client from google-auth-library
  const payload = decodeJwtPayload(idToken) as unknown as GooglePayload;

  if (!payload.email) {
    throw new UnauthorizedError('Invalid Google token');
  }

  // Check if user exists with this Google ID
  let user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });

  if (!user) {
    // Check if email exists (link accounts)
    user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    } else {
      // Create new user
      const username = await generateUniqueUsername(payload.email);
      user = await prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          username,
          displayName: payload.name || username,
          avatarUrl: payload.picture,
          isVerified: payload.email_verified ?? false,
          userType: 'PARTICIPANT',
        },
      });
    }
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    userType: user.userType,
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

// -----------------------------------------------------------------------------
// OAuth: Apple
// -----------------------------------------------------------------------------

interface ApplePayload {
  sub: string;      // Apple user ID
  email?: string;   // Only provided on first sign-in
}

export const appleAuth = async (idToken: string): Promise<AuthResponse> => {
  // In production, verify the token with Apple's API
  // This is a placeholder - implement proper verification

  const payload = decodeJwtPayload(idToken) as unknown as ApplePayload;

  if (!payload.sub) {
    throw new UnauthorizedError('Invalid Apple token');
  }

  // Check if user exists with this Apple ID
  let user = await prisma.user.findUnique({
    where: { appleId: payload.sub },
  });

  if (!user) {
    if (!payload.email) {
      throw new UnauthorizedError('Email required for first-time Apple sign-in');
    }

    // Check if email exists (link accounts)
    user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (user) {
      // Link Apple account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleId: payload.sub },
      });
    } else {
      // Create new user
      const username = await generateUniqueUsername(payload.email);
      user = await prisma.user.create({
        data: {
          email: payload.email,
          appleId: payload.sub,
          username,
          displayName: username,
          userType: 'PARTICIPANT',
        },
      });
    }
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    userType: user.userType,
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Decode JWT payload without verification (for development)
// In production, use proper libraries to verify tokens
const decodeJwtPayload = (token: string): Record<string, unknown> => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    throw new UnauthorizedError('Invalid token format');
  }
};

// Generate unique username from email
const generateUniqueUsername = async (email: string): Promise<string> => {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const username = base.slice(0, 25); // Leave room for numbers
  let counter = 0;

  while (true) {
    const candidate = counter === 0 ? username : `${username}${counter}`;
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!exists) {
      return candidate;
    }
    counter++;
  }
};
