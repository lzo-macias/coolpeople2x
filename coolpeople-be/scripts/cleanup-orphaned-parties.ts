/**
 * Script to clean up orphaned parties (parties with 0 members)
 * Run with: npx tsx scripts/cleanup-orphaned-parties.ts
 */

import { prisma } from '../src/lib/prisma.js';

async function cleanupOrphanedParties() {
  console.log('🔍 Finding orphaned parties (parties with 0 members)...\n');

  // Find parties that have no members but aren't soft-deleted
  const orphanedParties = await prisma.party.findMany({
    where: {
      deletedAt: null,
      memberships: {
        none: {},
      },
    },
    select: { id: true, name: true, handle: true, createdAt: true },
  });

  if (orphanedParties.length === 0) {
    console.log('✅ No orphaned parties found. Database is clean!\n');
    return;
  }

  console.log(`Found ${orphanedParties.length} orphaned parties:\n`);
  orphanedParties.forEach((p, i) => {
    console.log(`  ${i + 1}. "${p.name}" (@${p.handle}) - created ${p.createdAt.toISOString()}`);
  });
  console.log('');

  // Clean up each orphaned party
  console.log('🧹 Cleaning up orphaned parties...\n');

  await prisma.$transaction(async (tx) => {
    for (const party of orphanedParties) {
      console.log(`  Processing: ${party.name}...`);

      // Clear partyId from any users who have this as their primary party
      const usersUpdated = await tx.user.updateMany({
        where: { partyId: party.id },
        data: { partyId: null },
      });
      if (usersUpdated.count > 0) {
        console.log(`    - Cleared primary party from ${usersUpdated.count} user(s)`);
      }

      // Delete related data (NOT posts - they live on user profiles too)
      const followsDeleted = await tx.partyFollow.deleteMany({ where: { partyId: party.id } });
      if (followsDeleted.count > 0) {
        console.log(`    - Deleted ${followsDeleted.count} follow(s)`);
      }

      const requestsDeleted = await tx.partyJoinRequest.deleteMany({ where: { partyId: party.id } });
      if (requestsDeleted.count > 0) {
        console.log(`    - Deleted ${requestsDeleted.count} join request(s)`);
      }

      const chatsDeleted = await tx.groupChat.deleteMany({ where: { partyId: party.id } });
      if (chatsDeleted.count > 0) {
        console.log(`    - Deleted ${chatsDeleted.count} group chat(s)`);
      }

      const ledgersDeleted = await tx.pointLedger.deleteMany({ where: { partyId: party.id } });
      if (ledgersDeleted.count > 0) {
        console.log(`    - Deleted ${ledgersDeleted.count} point ledger(s)`);
      }

      const competitorsDeleted = await tx.raceCompetitor.deleteMany({ where: { partyId: party.id } });
      if (competitorsDeleted.count > 0) {
        console.log(`    - Deleted ${competitorsDeleted.count} race competitor(s)`);
      }

      const icebreakersDeleted = await tx.icebreaker.deleteMany({ where: { partyId: party.id } });
      if (icebreakersDeleted.count > 0) {
        console.log(`    - Deleted ${icebreakersDeleted.count} icebreaker(s)`);
      }

      // Note: Posts (Reels) are NOT deleted - they remain associated with the user
      // The partyId on Reel is just for categorization, not ownership

      // Soft delete the party
      await tx.party.update({
        where: { id: party.id },
        data: { deletedAt: new Date() },
      });
      console.log(`    - Soft-deleted party ✓`);
    }
  });

  console.log(`\n✅ Successfully cleaned up ${orphanedParties.length} orphaned parties!`);
  console.log('   Note: Posts associated with these parties are preserved on user profiles.\n');
}

// Run the cleanup
cleanupOrphanedParties()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error during cleanup:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
