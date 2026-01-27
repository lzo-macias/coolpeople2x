import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks - declared before the module under test is imported
// ---------------------------------------------------------------------------

// Track middleware and connection handlers registered via io.use / io.on
let registeredMiddleware: ((socket: any, next: any) => void)[] = [];
let connectionHandler: ((socket: any) => void) | null = null;

const mockAdapter = vi.fn();

class MockSocketServer {
  constructor(public httpServer: any, public opts: any) {}

  adapter = mockAdapter;

  use(fn: (socket: any, next: any) => void) {
    registeredMiddleware.push(fn);
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (event === 'connection') {
      connectionHandler = handler;
    }
  }
}

vi.mock('socket.io', () => ({
  Server: MockSocketServer,
}));

vi.mock('@socket.io/redis-adapter', () => ({
  createAdapter: vi.fn(() => 'mock-adapter'),
}));

vi.mock('./redis.js', () => ({
  createRedisClient: vi.fn(() => ({})),
}));

vi.mock('../middleware/auth.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('./prisma.js', () => ({
  prisma: {
    raceFollow: { findMany: vi.fn() },
    partyMembership: { findMany: vi.fn() },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createRedisClient } from './redis.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from './prisma.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal mock socket object */
const createMockSocket = (auth: Record<string, any> = {}) => {
  const eventHandlers: Record<string, ((...args: any[]) => void)[]> = {};
  return {
    handshake: { auth },
    join: vi.fn(),
    leave: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    // helper to fire a registered event in tests
    _emit(event: string, ...args: any[]) {
      (eventHandlers[event] ?? []).forEach((h) => h(...args));
    },
    userId: undefined as string | undefined,
    userType: undefined as string | undefined,
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('socket', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();

    // Reset captured handlers from the previous run
    registeredMiddleware = [];
    connectionHandler = null;

    // Re-apply mock implementations that restoreAllMocks cleared
    (createRedisClient as Mock).mockReturnValue({});
    (verifyToken as Mock).mockReset();
    (prisma.raceFollow.findMany as Mock).mockReset();
    (prisma.partyMembership.findMany as Mock).mockReset();
    mockAdapter.mockClear();
  });

  // -------------------------------------------------------------------------
  // getIO / initializeSocket basics
  // -------------------------------------------------------------------------

  describe('getIO', () => {
    it('returns null before initialization', async () => {
      const { getIO } = await import('./socket.js');
      expect(getIO()).toBeNull();
    });
  });

  describe('initializeSocket', () => {
    it('creates and returns a SocketServer', async () => {
      const { initializeSocket } = await import('./socket.js');
      const fakeHttp = {} as any;

      const io = initializeSocket(fakeHttp);

      expect(io).toBeInstanceOf(MockSocketServer);
    });

    it('makes getIO return the server after initialization', async () => {
      const { initializeSocket, getIO } = await import('./socket.js');
      const fakeHttp = {} as any;

      const io = initializeSocket(fakeHttp);

      expect(getIO()).toBe(io);
    });
  });

  // -------------------------------------------------------------------------
  // Redis adapter
  // -------------------------------------------------------------------------

  describe('Redis adapter', () => {
    it('handles adapter failure gracefully (logs, does not throw)', async () => {
      (createRedisClient as Mock).mockImplementation(() => {
        throw new Error('Redis unavailable');
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { initializeSocket } = await import('./socket.js');

      expect(() => initializeSocket({} as any)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Socket.io Redis adapter failed'),
        'Redis unavailable',
      );
    });
  });

  // -------------------------------------------------------------------------
  // JWT authentication middleware
  // -------------------------------------------------------------------------

  describe('JWT auth middleware', () => {
    /** Import the module and initialise so the middleware is registered */
    async function setup() {
      const { initializeSocket } = await import('./socket.js');
      initializeSocket({} as any);
      // The first (and only) middleware registered should be the JWT check
      expect(registeredMiddleware.length).toBeGreaterThanOrEqual(1);
      return registeredMiddleware[0];
    }

    it('rejects connections without a token', async () => {
      const middleware = await setup();
      const socket = createMockSocket({}); // no token
      const next = vi.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('Authentication required');
    });

    it('rejects connections with an invalid token', async () => {
      (verifyToken as Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const middleware = await setup();
      const socket = createMockSocket({ token: 'bad-token' });
      const next = vi.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('Invalid token');
    });

    it('accepts connections with a valid token and sets userId / userType', async () => {
      (verifyToken as Mock).mockReturnValue({
        userId: 'user-123',
        userType: 'PARTICIPANT',
      });

      const middleware = await setup();
      const socket = createMockSocket({ token: 'good-token' });
      const next = vi.fn();

      middleware(socket, next);

      // next called without an error
      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-123');
      expect(socket.userType).toBe('PARTICIPANT');
    });
  });

  // -------------------------------------------------------------------------
  // Connection handler - auto-join rooms
  // -------------------------------------------------------------------------

  describe('connection handler', () => {
    /** Import, initialise, and return the captured connection handler */
    async function setup() {
      const { initializeSocket } = await import('./socket.js');
      initializeSocket({} as any);
      expect(connectionHandler).not.toBeNull();
      return connectionHandler!;
    }

    it('auto-joins the user personal room', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'user-42';

      await handler(socket);

      expect(socket.join).toHaveBeenCalledWith('user:user-42');
    });

    it('auto-joins followed race rooms', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([
        { raceId: 'race-1' },
        { raceId: 'race-2' },
      ]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'user-55';

      await handler(socket);

      expect(socket.join).toHaveBeenCalledWith('race:race-1');
      expect(socket.join).toHaveBeenCalledWith('race:race-2');
    });

    it('auto-joins party rooms', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([
        { partyId: 'party-a' },
        { partyId: 'party-b' },
      ]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'user-77';

      await handler(socket);

      expect(socket.join).toHaveBeenCalledWith('party:party-a');
      expect(socket.join).toHaveBeenCalledWith('party:party-b');
    });

    // -----------------------------------------------------------------------
    // Event-based room management
    // -----------------------------------------------------------------------

    it('joins a race room on join:race', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'user-1';

      await handler(socket);

      socket._emit('join:race', 'race-99');

      expect(socket.join).toHaveBeenCalledWith('race:race-99');
    });

    it('leaves a race room on leave:race', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'user-1';

      await handler(socket);

      socket._emit('leave:race', 'race-99');

      expect(socket.leave).toHaveBeenCalledWith('race:race-99');
    });

    it('joins a conversation room with sorted ids on join:conversation', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'bbb';

      await handler(socket);

      socket._emit('join:conversation', 'aaa');

      // ids sorted: aaa < bbb
      expect(socket.join).toHaveBeenCalledWith('conversation:aaa:bbb');
    });

    it('leaves a conversation room with sorted ids on leave:conversation', async () => {
      (prisma.raceFollow.findMany as Mock).mockResolvedValue([]);
      (prisma.partyMembership.findMany as Mock).mockResolvedValue([]);

      const handler = await setup();
      const socket = createMockSocket();
      (socket as any).userId = 'aaa';

      await handler(socket);

      socket._emit('leave:conversation', 'bbb');

      expect(socket.leave).toHaveBeenCalledWith('conversation:aaa:bbb');
    });
  });
});
