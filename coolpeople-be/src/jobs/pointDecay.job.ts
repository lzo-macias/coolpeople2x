/**
 * Point Decay Job
 * Runs nightly to expire point events older than 90 days.
 * Expired events get a corresponding negative DECAY event,
 * and ledger totals are recalculated.
 */

import { prisma } from '../lib/prisma.js';
import { recalculateLedgerTotal } from '../modules/points/points.service.js';

const DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 100;

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startPointDecayJob = (): void => {
  if (intervalId) return;

  console.log('Point decay job started (runs every 24 hours)');

  // Run immediately on startup
  runDecayJob();

  // Then run every 24 hours
  intervalId = setInterval(runDecayJob, DECAY_INTERVAL_MS);
};

export const stopPointDecayJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Point decay job stopped');
  }
};

const runDecayJob = async (): Promise<void> => {
  try {
    const now = new Date();
    let totalExpired = 0;
    const affectedLedgerIds = new Set<string>();

    // Process in batches
    while (true) {
      const expiredEvents = await prisma.pointEvent.findMany({
        where: {
          expiresAt: { lt: now },
          isExpired: false,
          action: { not: 'DECAY' },
        },
        take: BATCH_SIZE,
        select: { id: true, ledgerId: true, points: true },
      });

      if (expiredEvents.length === 0) break;

      // Create DECAY events and mark originals as expired
      await prisma.$transaction([
        // Create negative DECAY events
        ...expiredEvents.map((event) =>
          prisma.pointEvent.create({
            data: {
              ledgerId: event.ledgerId,
              action: 'DECAY',
              points: -event.points,
              expiresAt: null,
              isExpired: false,
            },
          })
        ),
        // Mark originals as expired
        prisma.pointEvent.updateMany({
          where: { id: { in: expiredEvents.map((e) => e.id) } },
          data: { isExpired: true },
        }),
      ]);

      for (const event of expiredEvents) {
        affectedLedgerIds.add(event.ledgerId);
      }

      totalExpired += expiredEvents.length;
    }

    // Recalculate affected ledger totals
    for (const ledgerId of affectedLedgerIds) {
      await recalculateLedgerTotal(ledgerId);
    }

    if (totalExpired > 0) {
      console.log(
        `Point decay job: expired ${totalExpired} events, recalculated ${affectedLedgerIds.size} ledgers`
      );
    }
  } catch (error) {
    console.error('Point decay job error:', error);
  }
};
