/**
 * Database Seed Script
 * Seeds the database with initial data (system races, test users, etc.)
 * Run with: npm run db:seed
 */

import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RaceType, WinCondition } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Set up PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter and client
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

// -----------------------------------------------------------------------------
// System Races
// These always exist and cannot be deleted
// -----------------------------------------------------------------------------

// End date for testing: one month from now
const testEndDate = new Date();
testEndDate.setMonth(testEndDate.getMonth() + 1);

const systemRaces = [
  {
    title: 'CoolPeople',
    description: 'The yearly global race for all candidates. Which candidate will reign supreme?',
    raceType: RaceType.CANDIDATE_VS_CANDIDATE,
    winCondition: WinCondition.POINTS,
    isSystemRace: true,
    endDate: testEndDate,
  },
  {
    title: 'Best Party',
    description: 'The yearly global race for all parties. Which party will reign supreme?',
    raceType: RaceType.PARTY_VS_PARTY,
    winCondition: WinCondition.POINTS,
    isSystemRace: true,
    endDate: testEndDate,
  },
];

// -----------------------------------------------------------------------------
// Test Users for Local Development
// All passwords: "test123"
// -----------------------------------------------------------------------------

const testUsers: Array<{
  email: string;
  username: string;
  displayName: string;
  userType: 'CANDIDATE' | 'PARTICIPANT';
}> = [
  {
    email: 'alice@test.com',
    username: 'alice',
    displayName: 'Alice Anderson',
    userType: 'CANDIDATE',
  },
  {
    email: 'bob@test.com',
    username: 'bob',
    displayName: 'Bob Builder',
    userType: 'CANDIDATE',
  },
  {
    email: 'charlie@test.com',
    username: 'charlie',
    displayName: 'Charlie Chen',
    userType: 'PARTICIPANT',
  },
  {
    email: 'diana@test.com',
    username: 'diana',
    displayName: 'Diana Davis',
    userType: 'PARTICIPANT',
  },
];

// -----------------------------------------------------------------------------
// Main seed function
// -----------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...\n');

  // Seed system races
  console.log('Creating system races...');
  for (const race of systemRaces) {
    const existing = await prisma.race.findFirst({
      where: { title: race.title, isSystemRace: true },
    });

    if (existing) {
      console.log(`  - ${race.title} already exists, skipping`);
    } else {
      await prisma.race.create({ data: race });
      console.log(`  - Created: ${race.title}`);
    }
  }

  // Seed test users
  console.log('\nCreating test users...');
  const passwordHash = await bcrypt.hash('test123', SALT_ROUNDS);

  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`  - ${userData.username} already exists, skipping`);
    } else {
      const user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });
      console.log(`  - Created: ${userData.username} (${userData.userType}) [${user.id}]`);
    }
  }

  // Create follows between test users so they can see each other's content
  console.log('\nCreating follow relationships...');
  const allUsers = await prisma.user.findMany({
    where: { email: { in: testUsers.map(u => u.email) } },
  });

  // Each user follows all other test users
  for (const follower of allUsers) {
    for (const following of allUsers) {
      if (follower.id !== following.id) {
        const existingFollow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: follower.id,
              followingId: following.id,
            },
          },
        });

        if (!existingFollow) {
          await prisma.follow.create({
            data: {
              followerId: follower.id,
              followingId: following.id,
            },
          });
          console.log(`  - ${follower.username} now follows ${following.username}`);
        }
      }
    }
  }

  console.log('\nSeeding complete!');
}

// -----------------------------------------------------------------------------
// Cleanup orphaned parties
// Parties with 0 members that weren't properly deleted
// -----------------------------------------------------------------------------

async function cleanupOrphanedParties() {
  console.log('\nCleaning up orphaned parties...');

  // Find all parties that are not deleted
  const activeParties = await prisma.party.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { memberships: true } },
    },
  });

  // Filter to parties with 0 members
  const orphanedParties = activeParties.filter((p) => p._count.memberships === 0);

  if (orphanedParties.length === 0) {
    console.log('  No orphaned parties found.');
    return;
  }

  console.log(`  Found ${orphanedParties.length} orphaned parties:`);

  for (const party of orphanedParties) {
    console.log(`    - "${party.name}" (${party.id})`);

    // Clean up related data and soft-delete the party
    await prisma.$transaction(async (tx) => {
      // Clear partyId from any users who have this as their primary party
      await tx.user.updateMany({
        where: { partyId: party.id },
        data: { partyId: null },
      });

      // Delete related data
      await tx.partyFollow.deleteMany({ where: { partyId: party.id } });
      await tx.partyJoinRequest.deleteMany({ where: { partyId: party.id } });
      await tx.groupChat.deleteMany({ where: { partyId: party.id } });

      // Remove from race competitions and point ledgers
      await tx.pointLedger.deleteMany({ where: { partyId: party.id } });
      await tx.raceCompetitor.deleteMany({ where: { partyId: party.id } });

      // Soft delete the party
      await tx.party.update({
        where: { id: party.id },
        data: { deletedAt: new Date() },
      });
    });

    console.log(`      Deleted.`);
  }

  console.log(`  Cleaned up ${orphanedParties.length} orphaned parties.`);
}

// -----------------------------------------------------------------------------
// Execute
// -----------------------------------------------------------------------------

const command = process.argv[2];

if (command === 'cleanup-parties') {
  cleanupOrphanedParties()
    .catch((e) => {
      console.error('Cleanup failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
} else {
  main()
    .then(() => cleanupOrphanedParties())
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
