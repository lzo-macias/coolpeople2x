import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis instance methods
const mockRedisInstance = {
  on: vi.fn().mockReturnThis(),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue('OK'),
  publish: vi.fn().mockResolvedValue(1),
};

// Use a class mock so `new Redis(...)` works
vi.mock('ioredis', () => ({
  Redis: class MockRedis {
    on: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    constructor() {
      this.on = mockRedisInstance.on;
      this.ping = mockRedisInstance.ping;
      this.quit = mockRedisInstance.quit;
      this.publish = mockRedisInstance.publish;
      return this;
    }
  },
}));

vi.mock('../config/env.js', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
}));

// Must import after mocks
let mod: typeof import('./redis.js');

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset module so the singleton `redis` variable is cleared between tests
  vi.resetModules();
  mod = await import('./redis.js');
});

describe('Redis Client', () => {
  describe('getRedis', () => {
    it('returns a Redis client instance', () => {
      const client = mod.getRedis();
      expect(client).toBeDefined();
      expect(client.on).toBeDefined();
    });

    it('returns the same instance on subsequent calls (singleton)', () => {
      const client1 = mod.getRedis();
      const client2 = mod.getRedis();
      expect(client1).toBe(client2);
    });
  });

  describe('createRedisClient', () => {
    it('creates a new Redis client each call', () => {
      const client1 = mod.createRedisClient();
      const client2 = mod.createRedisClient();
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });
  });

  describe('connectRedis', () => {
    it('pings Redis to verify connection', async () => {
      await mod.connectRedis();
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it('does not throw if ping fails', async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(mod.connectRedis()).resolves.toBeUndefined();
    });
  });

  describe('publishEvent', () => {
    it('publishes JSON-serialized data to a channel', async () => {
      await mod.publishEvent('test:channel', { foo: 'bar' });
      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        'test:channel',
        '{"foo":"bar"}'
      );
    });

    it('does not throw on publish failure', async () => {
      mockRedisInstance.publish.mockRejectedValueOnce(new Error('Publish failed'));
      await expect(mod.publishEvent('ch', {})).resolves.toBeUndefined();
    });
  });
});
