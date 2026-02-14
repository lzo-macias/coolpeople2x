/**
 * Environment configuration
 * Centralizes all environment variables with validation and defaults
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// -----------------------------------------------------------------------------
// Schema: Define and validate all environment variables
// -----------------------------------------------------------------------------

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // Frontend URL (for Stripe redirect)
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Storage (optional for now)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Parse and export
// -----------------------------------------------------------------------------

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Convenience exports
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
