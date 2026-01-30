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

import type { Redis } from 'ioredis';

let io: SocketServer | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

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
    pubClient = createRedisClient();
    subClient = createRedisClient();
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

/**
 * Close Socket.io server and all connections
 */
export const closeSocket = async (): Promise<void> => {
  // Close Socket.io server
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        console.log('Socket.io server closed');
        io = null;
        resolve();
      });
    });
  }

  // Close Redis pub/sub clients
  if (pubClient) {
    await pubClient.quit();
    pubClient = null;
    console.log('Socket.io pub client closed');
  }
  if (subClient) {
    await subClient.quit();
    subClient = null;
    console.log('Socket.io sub client closed');
  }
};

// -----------------------------------------------------------------------------
// Emit Helpers for Real-time Updates
// -----------------------------------------------------------------------------

/**
 * Emit a new story to all followers of the creator
 */
export const emitNewStory = async (
  creatorId: string,
  story: {
    id: string;
    videoUrl: string;
    thumbnailUrl?: string;
    createdAt: Date;
    expiresAt: Date;
    user: { id: string; username: string; displayName?: string; avatarUrl?: string };
  }
): Promise<void> => {
  if (!io) return;

  try {
    // Get all followers of the creator
    const followers = await prisma.follow.findMany({
      where: { followingId: creatorId },
      select: { followerId: true },
    });

    // Emit to each follower's personal room
    for (const follower of followers) {
      io.to(`user:${follower.followerId}`).emit('story:new', story);
    }
  } catch (err) {
    console.error('Failed to emit new story:', (err as Error).message);
  }
};

/**
 * Emit story expiry notification
 */
export const emitStoryExpired = (storyId: string, creatorId: string): void => {
  if (!io) return;
  // Broadcast to anyone who might be viewing stories
  io.emit('story:expired', { storyId, creatorId });
};

/**
 * Emit new message to a conversation
 */
export const emitNewMessage = (
  senderId: string,
  receiverId: string,
  message: {
    id: string;
    content: string;
    createdAt: Date;
  }
): void => {
  if (!io) return;

  // Emit to receiver's personal room
  io.to(`user:${receiverId}`).emit('message:new', {
    senderId,
    receiverId,
    message,
  });

  // Also emit to conversation room for real-time chat
  const ids = [senderId, receiverId].sort();
  io.to(`conversation:${ids[0]}:${ids[1]}`).emit('message:new', {
    senderId,
    receiverId,
    message,
  });
};

/**
 * Emit typing indicator
 */
export const emitTyping = (senderId: string, receiverId: string, isTyping: boolean): void => {
  if (!io) return;

  io.to(`user:${receiverId}`).emit('message:typing', {
    userId: senderId,
    isTyping,
  });
};

/**
 * Emit activity notification (likes, comments, etc.)
 */
export const emitActivity = (
  userId: string,
  activity: {
    type: 'LIKE' | 'COMMENT' | 'REPOST' | 'REVIEW' | 'NOMINATE' | 'BALLOT' | 'FOLLOW';
    actorId: string;
    actorUsername: string;
    actorAvatarUrl?: string;
    targetId?: string;
    targetType?: string;
    createdAt: Date;
  }
): void => {
  if (!io) return;

  io.to(`user:${userId}`).emit('activity:new', activity);
};

/**
 * Emit online status change
 */
export const emitOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  if (!io) return;

  try {
    // Get user's followers and people they're chatting with
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    for (const follower of followers) {
      io.to(`user:${follower.followerId}`).emit('user:status', {
        userId,
        isOnline,
      });
    }
  } catch (err) {
    console.error('Failed to emit online status:', (err as Error).message);
  }
};

/**
 * Emit scoreboard update for a race
 */
export const emitScoreboardUpdate = (
  raceId: string,
  update: {
    userId?: string;
    partyId?: string;
    points: number;
    rank: number;
  }
): void => {
  if (!io) return;

  io.to(`race:${raceId}`).emit('scoreboard:update', {
    raceId,
    ...update,
  });
};

/**
 * Emit party chat message
 */
export const emitPartyChatMessage = (
  partyId: string,
  message: {
    id: string;
    senderId: string;
    senderUsername: string;
    content: string;
    createdAt: Date;
  }
): void => {
  if (!io) return;

  io.to(`party:${partyId}`).emit('party:message', {
    partyId,
    message,
  });
};

/**
 * Emit follow event to update follower count in real-time
 */
export const emitFollowUpdate = (
  targetUserId: string,
  follower: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  },
  isFollowing: boolean
): void => {
  if (!io) return;

  io.to(`user:${targetUserId}`).emit('follow:update', {
    follower,
    isFollowing,
  });
};
