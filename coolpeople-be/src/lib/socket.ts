/**
 * Socket.io Server
 * WebSocket server with JWT auth, Redis adapter, and room management
 */

import type { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient } from './redis.js';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from './prisma.js';

let io: SocketServer | null = null;

// -----------------------------------------------------------------------------
// Initialize Socket.io
// -----------------------------------------------------------------------------

export const initializeSocket = (httpServer: HTTPServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  try {
    const pubClient = createRedisClient();
    const subClient = createRedisClient();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter attached');
  } catch (err) {
    console.warn('Socket.io Redis adapter failed, using in-memory:', (err as Error).message);
  }

  // -------------------------------------------------------------------------
  // JWT Authentication Middleware
  // -------------------------------------------------------------------------

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).userType = payload.userType;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // -------------------------------------------------------------------------
  // Connection Handler
  // -------------------------------------------------------------------------

  io.on('connection', async (socket) => {
    const userId = (socket as any).userId as string;
    console.log(`Socket connected: user ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Auto-join rooms based on user's memberships
    try {
      await joinUserRooms(socket, userId);
    } catch (err) {
      console.error(`Failed to join rooms for user ${userId}:`, (err as Error).message);
    }

    // Handle room join requests
    socket.on('join:race', (raceId: string) => {
      socket.join(`race:${raceId}`);
    });

    socket.on('leave:race', (raceId: string) => {
      socket.leave(`race:${raceId}`);
    });

    socket.on('join:conversation', (otherUserId: string) => {
      const ids = [userId, otherUserId].sort();
      socket.join(`conversation:${ids[0]}:${ids[1]}`);
    });

    socket.on('leave:conversation', (otherUserId: string) => {
      const ids = [userId, otherUserId].sort();
      socket.leave(`conversation:${ids[0]}:${ids[1]}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  console.log('Socket.io server initialized');
  return io;
};

// -----------------------------------------------------------------------------
// Auto-join rooms for a user
// -----------------------------------------------------------------------------

const joinUserRooms = async (socket: any, userId: string): Promise<void> => {
  // Join followed race rooms
  const raceFollows = await prisma.raceFollow.findMany({
    where: { userId },
    select: { raceId: true },
  });
  for (const rf of raceFollows) {
    socket.join(`race:${rf.raceId}`);
  }

  // Join party rooms
  const memberships = await prisma.partyMembership.findMany({
    where: { userId },
    select: { partyId: true },
  });
  for (const m of memberships) {
    socket.join(`party:${m.partyId}`);
  }
};

// -----------------------------------------------------------------------------
// Accessor for emitting from services
// -----------------------------------------------------------------------------

export const getIO = (): SocketServer | null => {
  return io;
};
