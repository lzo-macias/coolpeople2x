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

const systemRaces = [
  {
    title: 'CoolPeople',
    description: 'The yearly global race for all candidates. Which candidate will reign supreme?',
    raceType: RaceType.CANDIDATE_VS_CANDIDATE,
    winCondition: WinCondition.POINTS,
    isSystemRace: true,
    endDate: null, // Rolling/never-ending
  },
  {
    title: 'Best Party',
    description: 'The yearly global race for all parties. Which party will reign supreme?',
    raceType: RaceType.PARTY_VS_PARTY,
    winCondition: WinCondition.POINTS,
    isSystemRace: true,
    endDate: null, // Rolling/never-ending
  },
];

// -----------------------------------------------------------------------------
// Test Users
// -----------------------------------------------------------------------------

const testUsers = [
  {
    email: 'alice@test.com',
    username: 'alice',
    displayName: 'Alice Admin',
    userType: 'CANDIDATE' as const,
  },
  {
    email: 'bob@test.com',
    username: 'bob',
    displayName: 'Bob Builder',
    userType: 'CANDIDATE' as const,
  },
  {
    email: 'charlie@test.com',
    username: 'charlie',
    displayName: 'Charlie Chatter',
    userType: 'PARTICIPANT' as const,
  },
  {
    email: 'diana@test.com',
    username: 'diana',
    displayName: 'Diana Dancer',
    userType: 'PARTICIPANT' as const,
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
  const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

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

  console.log('\nSeeding complete!');
}

// -----------------------------------------------------------------------------
// Execute
// -----------------------------------------------------------------------------

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
