/**
 * Story Expiry Job
 * Runs periodically to soft-delete expired stories.
 * In production, this would be triggered by a cron scheduler (e.g., node-cron).
 * For MVP, it runs on a setInterval inside the main process.
 */

import { expireStories } from '../modules/stories/stories.service.js';

const STORY_EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startStoryExpiryJob = (): void => {
  if (intervalId) return; // Already running

  console.log('Story expiry job started (runs every hour)');

  // Run immediately on startup
  runExpiryJob();

  // Then run every hour
  intervalId = setInterval(runExpiryJob, STORY_EXPIRY_INTERVAL_MS);
};

export const stopStoryExpiryJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Story expiry job stopped');
  }
};

const runExpiryJob = async (): Promise<void> => {
  try {
    const count = await expireStories();
    if (count > 0) {
      console.log(`Story expiry job: expired ${count} stories`);
    }
  } catch (error) {
    console.error('Story expiry job error:', error);
  }
};
