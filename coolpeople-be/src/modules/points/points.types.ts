/**
 * Points Module Types
 */

// -----------------------------------------------------------------------------
// Point Event Recording
// -----------------------------------------------------------------------------

export interface RecordPointEventParams {
  targetUserId?: string;
  targetPartyId?: string;
  raceId: string;
  action: string;
  points: number;
  sourceUserId?: string;
  sourceReelId?: string;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface PointSummary {
  ledgerId: string;
  totalPoints: number;
  tier: string;
  raceId: string;
  raceName: string;
}

export interface PointHistoryItem {
  id: string;
  action: string;
  points: number;
  sourceUserId: string | null;
  sourceReelId: string | null;
  createdAt: Date;
}

export interface SparklineDataPoint {
  date: string;
  points: number;
  tier: string;
  rank: number | null;
}
