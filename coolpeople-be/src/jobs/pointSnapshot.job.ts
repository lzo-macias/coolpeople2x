/**
 * Point Snapshot Job
 * Runs daily to capture point snapshots for sparkline charts.
 * Creates a PointSnapshot for every active ledger with current points, tier, and rank.
 */

import { prisma } from '../lib/prisma.js';

const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 100;

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startPointSnapshotJob = (): void => {
  if (intervalId) return;

  console.log('Point snapshot job started (runs every 24 hours)');

  // Run immediately on startup
  runSnapshotJob();

  // Then run every 24 hours
  intervalId = setInterval(runSnapshotJob, SNAPSHOT_INTERVAL_MS);
};

export const stopPointSnapshotJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Point snapshot job stopped');
  }
};

const runSnapshotJob = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unique race IDs that have active ledgers
    const races = await prisma.race.findMany({
      select: { id: true },
    });

    let totalSnapshots = 0;

    for (const race of races) {
      // Get all ledgers for this race, ordered by points (for ranking)
      let skip = 0;
      let rank = 1;

      while (true) {
        const ledgers = await prisma.pointLedger.findMany({
          where: { raceId: race.id },
          orderBy: { totalPoints: 'desc' },
          skip,
          take: BATCH_SIZE,
          select: { id: true, totalPoints: true, tier: true },
        });

        if (ledgers.length === 0) break;

        // Upsert snapshots for each ledger
        for (const ledger of ledgers) {
          await prisma.pointSnapshot.upsert({
            where: {
              ledgerId_date: { ledgerId: ledger.id, date: today },
            },
            create: {
              ledgerId: ledger.id,
              points: ledger.totalPoints,
              tier: ledger.tier,
              rank,
              date: today,
            },
            update: {
              points: ledger.totalPoints,
              tier: ledger.tier,
              rank,
            },
          });

          rank++;
          totalSnapshots++;
        }

        skip += BATCH_SIZE;
      }
    }

    if (totalSnapshots > 0) {
      console.log(`Point snapshot job: created/updated ${totalSnapshots} snapshots`);
    }
  } catch (error) {
    console.error('Point snapshot job error:', error);
  }
};
