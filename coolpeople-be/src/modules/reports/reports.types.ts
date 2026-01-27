/**
 * Reports Module Types
 */

import type { ReportTargetType, ReportStatus } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Report Response
// -----------------------------------------------------------------------------

export interface ReportResponse {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  moderatorNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

// -----------------------------------------------------------------------------
// Create Report Request
// -----------------------------------------------------------------------------

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Resolve Report Request
// -----------------------------------------------------------------------------

export interface ResolveReportRequest {
  status: 'CONFIRMED' | 'REJECTED';
  moderatorNotes?: string;
}
