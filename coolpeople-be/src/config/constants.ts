/**
 * Application constants
 * Centralized configuration for business rules, point weights, tiers, etc.
 */

// -----------------------------------------------------------------------------
// Tier System
// Points thresholds for each tier (per race)
// -----------------------------------------------------------------------------

export const TIERS = {
  BRONZE: { name: 'Bronze', min: 0, max: 999 },
  SILVER: { name: 'Silver', min: 1000, max: 2499 },
  GOLD: { name: 'Gold', min: 2500, max: 4999 },
  DIAMOND: { name: 'Diamond', min: 5000, max: 9999 },
  CHALLENGER: { name: 'Challenger', min: 10000, max: 24999 },
  MASTER: { name: 'Master', min: 25000, max: Infinity },
} as const;

export type TierName = keyof typeof TIERS;

export const getTierFromPoints = (points: number): TierName => {
  if (points >= TIERS.MASTER.min) return 'MASTER';
  if (points >= TIERS.CHALLENGER.min) return 'CHALLENGER';
  if (points >= TIERS.DIAMOND.min) return 'DIAMOND';
  if (points >= TIERS.GOLD.min) return 'GOLD';
  if (points >= TIERS.SILVER.min) return 'SILVER';
  return 'BRONZE';
};

// -----------------------------------------------------------------------------
// Point Weights
// How many points each action awards (positive) or deducts (negative)
// -----------------------------------------------------------------------------

export const POINT_WEIGHTS = {
  // Positive actions (awarded to target user/party)
  LIKE: 1,
  COMMENT: 2,
  SAVE: 3,
  SHARE: 4,
  NOMINATE: 5,
  FOLLOW: 2,                    // One-time on follow
  WATCH_FULL: 1,                // Video watched >80%
  WATCH_PARTIAL: 0.5,           // Video watched 30-80%
  REVIEW_5_STAR: 10,
  REVIEW_4_STAR: 6,
  REVIEW_3_STAR: 2,
  REVIEW_2_STAR: -2,
  REVIEW_1_STAR: -5,
  BALLOT_RANK_1: 8,             // When ballot closes
  BALLOT_RANK_2: 5,
  BALLOT_RANK_3: 3,
  DM_RECEIVED: 1,               // Capped at 5/day per sender

  // Negative actions
  HIDE: -3,                     // User hides content from creator
  REPORT_CONFIRMED: -10,        // Only if moderation confirms violation
  UNFOLLOW: -1,
} as const;

export const DM_POINTS_DAILY_CAP = 5;  // Max points from DMs per sender per day

// -----------------------------------------------------------------------------
// Point Decay
// Rolling window for point relevance
// -----------------------------------------------------------------------------

export const POINT_DECAY_WINDOW_DAYS = 90;  // Actions older than this phase out

export const BASE_STARTER_POINTS = 5;  // Minimum points every new candidate starts with

// -----------------------------------------------------------------------------
// Video Constraints
// -----------------------------------------------------------------------------

export const VIDEO_LIMITS = {
  REEL_MIN_SECONDS: 15,
  REEL_MAX_SECONDS: 90,
  STORY_MAX_SECONDS: 60,
  MAX_RESOLUTION: 720,          // 720p max for bandwidth optimization
} as const;

// -----------------------------------------------------------------------------
// Party Permissions
// -----------------------------------------------------------------------------

export const PARTY_PERMISSIONS = {
  VIEW: 'view',           // Can see party content and chat (default)
  POST: 'post',           // Can create reels on behalf of party
  CHAT: 'chat',           // Can send messages in group chat
  INVITE: 'invite',       // Can invite new members
  MODERATE: 'moderate',   // Can remove posts, mute members, delete violating reviews
  ADMIN: 'admin',         // Admin control: edit settings, manage permissions, remove members (can be tiered: admin1, admin2, etc.)
  LEADER: 'leader',       // Party creator only - full control, cannot be removed
} as const;

export type PartyPermission = typeof PARTY_PERMISSIONS[keyof typeof PARTY_PERMISSIONS];

export const DEFAULT_MEMBER_PERMISSIONS: PartyPermission[] = ['view', 'chat'];
// Admin permissions - everything except leader
export const ADMIN_PERMISSIONS: PartyPermission[] = ['view', 'post', 'chat', 'invite', 'moderate', 'admin'];
// Leader permissions - party creator gets everything
export const LEADER_PERMISSIONS: PartyPermission[] = Object.values(PARTY_PERMISSIONS);

// -----------------------------------------------------------------------------
// Chat Modes
// -----------------------------------------------------------------------------

export const CHAT_MODES = {
  OPEN: 'open',           // All members with chat permission can message
  ADMIN_ONLY: 'admin_only', // Only admin/moderate can message, others react only
  CYCLE: 'cycle',         // Daily rotating cohorts based on engagement
} as const;

export type ChatMode = typeof CHAT_MODES[keyof typeof CHAT_MODES];

// -----------------------------------------------------------------------------
// Default System Races
// These are seeded at app initialization and always exist
// -----------------------------------------------------------------------------

export const SYSTEM_RACES = {
  COOLPEOPLE: {
    title: 'CoolPeople',
    description: 'The global race for all candidates. Compete to become the coolest person!',
    raceType: 'CANDIDATE_VS_CANDIDATE',
    winCondition: 'POINTS',
    isSystemRace: true,
  },
  BEST_PARTY: {
    title: 'Best Party',
    description: 'The global race for all parties. Which party reigns supreme?',
    raceType: 'PARTY_VS_PARTY',
    winCondition: 'POINTS',
    isSystemRace: true,
  },
} as const;

// -----------------------------------------------------------------------------
// Pagination
// -----------------------------------------------------------------------------

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// -----------------------------------------------------------------------------
// Rate Limits (for future implementation)
// -----------------------------------------------------------------------------

export const RATE_LIMITS = {
  NOMINATIONS_PER_RACE: 1,      // Can only nominate same person once per race
  // No daily cap on total nominations across different races
} as const;
