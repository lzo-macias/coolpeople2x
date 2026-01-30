/**
 * CoolPeople API Server
 * Main application entry point
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

import { env, isDev } from './config/env.js';
import { connectDB, disconnectDB } from './lib/prisma.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';
import { initializeSocket, closeSocket } from './lib/socket.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route imports
import { authRoutes } from './modules/auth/index.js';
import { usersRoutes } from './modules/users/index.js';
import { reelsRoutes } from './modules/reels/index.js';
import { reelCommentsRouter, commentsRouter } from './modules/comments/index.js';
import { storiesRoutes } from './modules/stories/index.js';
import { pointsRoutes } from './modules/points/index.js';
import { racesRoutes } from './modules/races/index.js';
import { partiesRoutes } from './modules/parties/index.js';
import { userReviewsRouter, partyReviewsRouter, reviewsRouter } from './modules/reviews/index.js';
import { favoritesActionRouter, favoritesListRouter } from './modules/favorites/index.js';
import { blockActionRouter, blockListRouter } from './modules/blocking/index.js';
import { messagesRouter } from './modules/messages/index.js';
import { reportsRouter } from './modules/reports/index.js';
import { notificationsRouter } from './modules/notifications/index.js';
import { searchRouter } from './modules/search/index.js';

// Jobs
import { startStoryExpiryJob, stopStoryExpiryJob } from './jobs/storyExpiry.job.js';
import { startPointDecayJob, stopPointDecayJob } from './jobs/pointDecay.job.js';
import { startPointSnapshotJob, stopPointSnapshotJob } from './jobs/pointSnapshot.job.js';
import { startBallotProcessJob, stopBallotProcessJob } from './jobs/ballotProcess.job.js';

// -----------------------------------------------------------------------------
// Initialize Express App
// -----------------------------------------------------------------------------

const app = express();
const server = http.createServer(app);

// -----------------------------------------------------------------------------
// Global Middleware
// -----------------------------------------------------------------------------

// CORS - configure for your frontend domain in production
app.use(cors({
  origin: isDev ? '*' : process.env.FRONTEND_URL,
  credentials: true,
}));

// Request logging
app.use(morgan(isDev ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving (uploads directory for local storage MVP)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/reels/:reelId/comments', reelCommentsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/stories', storiesRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/races', racesRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/users/:userId/reviews', userReviewsRouter);
app.use('/api/parties/:partyId/reviews', partyReviewsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/users/:id/favorite', favoritesActionRouter);
app.use('/api/me/favorites', favoritesListRouter);
app.use('/api/users/:id/block', blockActionRouter);
app.use('/api/me/blocked', blockListRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);

// Temporary root route
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'CoolPeople API v1.0.0',
      docs: '/api/docs', // Future: API documentation
    },
  });
});

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// -----------------------------------------------------------------------------
// Server Startup
// -----------------------------------------------------------------------------

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Initialize Socket.io
    initializeSocket(server);

    // Start background jobs
    startStoryExpiryJob();
    startPointDecayJob();
    startPointSnapshotJob();
    startBallotProcessJob();

    // Start listening
    server.listen(env.PORT, () => {
      console.log(`
========================================
  CoolPeople API Server
========================================
  Environment: ${env.NODE_ENV}
  Port:        ${env.PORT}
  Time:        ${new Date().toISOString()}
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Force exit after 5 seconds if graceful shutdown hangs
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 5000);

  try {
    // Stop all background jobs first (clears setInterval timers)
    stopStoryExpiryJob();
    stopPointDecayJob();
    stopPointSnapshotJob();
    stopBallotProcessJob();

    // Close Socket.io (disconnects all clients + closes Redis pub/sub)
    await closeSocket();

    // Close HTTP server (stop accepting new connections)
    server.closeAllConnections(); // Force close active connections
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });

    // Close database connections
    await disconnectRedis();
    await disconnectDB();

    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
startServer();

export default app;
