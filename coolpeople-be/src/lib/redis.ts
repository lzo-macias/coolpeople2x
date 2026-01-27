/**
 * Redis Client
 * Singleton client for general use + factory for pub/sub pairs
 */

import { Redis } from 'ioredis';
import { env } from '../config/env.js';

// -----------------------------------------------------------------------------
// Redis Client Singleton
// -----------------------------------------------------------------------------

let redis: Redis | null = null;

export const getRedis = (): Redis => {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) return null; // Stop retrying after 10 attempts
        return Math.min(times * 200, 5000);
      },
    });

    redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return redis;
};

// -----------------------------------------------------------------------------
// Factory for creating dedicated Redis clients (pub/sub needs separate clients)
// -----------------------------------------------------------------------------

export const createRedisClient = (): Redis => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
  });

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err.message);
  });

  return client;
};

// -----------------------------------------------------------------------------
// Connect / Disconnect
// -----------------------------------------------------------------------------

export const connectRedis = async (): Promise<void> => {
  const client = getRedis();
  // Ping to verify connection
  try {
    await client.ping();
    console.log('Redis connection verified');
  } catch (err) {
    console.warn('Redis not available - real-time features disabled:', (err as Error).message);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis disconnected');
  }
};

// -----------------------------------------------------------------------------
// Pub/Sub Helper
// -----------------------------------------------------------------------------

export const publishEvent = async (channel: string, data: unknown): Promise<void> => {
  try {
    const client = getRedis();
    await client.publish(channel, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to publish to ${channel}:`, (err as Error).message);
  }
};
