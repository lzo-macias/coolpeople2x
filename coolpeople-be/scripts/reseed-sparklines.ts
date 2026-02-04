/**
 * Script to reseed sparkline snapshots for all existing point ledgers.
 * Replaces old 7-day seed data with 90-day data so each period selector
 * (1D, 1W, 1M, 3M, ALL) shows a visually distinct sparkline.
 *
 * Run with: npx tsx scripts/reseed-sparklines.ts
 */

import { prisma } from '../src/lib/prisma.js';
import { seedInitialSparkline } from '../src/modules/points/points.service.js';

async function reseedSparklines() {
  console.log('Finding all point ledgers...\n');

  const ledgers = await prisma.pointLedger.findMany({
    select: { id: true, totalPoints: true, userId: true, partyId: true },
  });

  if (ledgers.length === 0) {
    console.log('No point ledgers found. Nothing to reseed.\n');
    return;
  }

  console.log(`Found ${ledgers.length} ledger(s). Reseeding sparklines...\n`);

  let success = 0;
  let failed = 0;

  for (const ledger of ledgers) {
    const owner = ledger.userId ? `user ${ledger.userId}` : `party ${ledger.partyId}`;
    try {
      await seedInitialSparkline(ledger.id);
      success++;
      console.log(`  [${success + failed}/${ledgers.length}] Reseeded ledger ${ledger.id} (${owner}, ${ledger.totalPoints} pts)`);
    } catch (err) {
      failed++;
      console.error(`  [${success + failed}/${ledgers.length}] FAILED ledger ${ledger.id} (${owner}):`, err);
    }
  }

  console.log(`\nDone! Reseeded ${success} ledger(s), ${failed} failed.\n`);
}

reseedSparklines()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Error during reseed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
