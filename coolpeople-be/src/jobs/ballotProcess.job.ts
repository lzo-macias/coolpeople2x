/**
 * Ballot Processing Job
 * Runs every 5 minutes to process closed ballots
 */

import { prisma } from '../lib/prisma.js';
import { processBallot } from '../modules/races/ballot.service.js';

const BALLOT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startBallotProcessJob = (): void => {
  if (intervalId) return;

  console.log('Ballot processing job started (runs every 5 minutes)');

  // Run immediately on startup
  runBallotProcessJob();

  // Then run every 5 minutes
  intervalId = setInterval(runBallotProcessJob, BALLOT_CHECK_INTERVAL_MS);
};

export const stopBallotProcessJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Ballot processing job stopped');
  }
};

const runBallotProcessJob = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find races where ballot has closed but not been processed
    const racesToProcess = await prisma.race.findMany({
      where: {
        winCondition: 'BALLOT',
        ballotClosesAt: { lt: now },
        ballotProcessed: false,
      },
      select: { id: true, title: true },
    });

    if (racesToProcess.length === 0) return;

    console.log(`Processing ${racesToProcess.length} ballot(s)...`);

    for (const race of racesToProcess) {
      try {
        await processBallot(race.id);
        console.log(`Ballot processed: ${race.title} (${race.id})`);
      } catch (err) {
        console.error(`Failed to process ballot for race ${race.id}:`, (err as Error).message);
      }
    }
  } catch (error) {
    console.error('Ballot processing job error:', error);
  }
};
