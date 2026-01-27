/**
 * Prisma Client Singleton
 * Ensures a single database connection instance across the application
 * Handles connection pooling and prevents multiple instances in development
 */

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/index.js';
import { env, isDev } from '../config/env.js';

// -----------------------------------------------------------------------------
// PostgreSQL Connection Pool
// -----------------------------------------------------------------------------

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

// -----------------------------------------------------------------------------
// Global singleton pattern for Prisma Client
// Prevents multiple instances during hot reloading in development
// -----------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDev) {
  globalForPrisma.prisma = prisma;
}

// -----------------------------------------------------------------------------
// Connection helpers
// -----------------------------------------------------------------------------

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
  await pool.end();
  console.log('Database disconnected');
};
