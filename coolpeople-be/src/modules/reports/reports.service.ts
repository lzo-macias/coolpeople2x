/**
 * Reports Service
 * Business logic for report management and moderation
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import { POINT_WEIGHTS } from '../../config/constants.js';
import { recordPointEvent } from '../points/points.service.js';
import type { ReportResponse, CreateReportRequest, ResolveReportRequest } from './reports.types.js';
import type { ReportStatus } from '../../../generated/prisma/index.js';

// -----------------------------------------------------------------------------
// Helper: Format report for API response
// -----------------------------------------------------------------------------

const formatReport = (report: any): ReportResponse => {
  return {
    id: report.id,
    reporterId: report.reporterId,
    reporter: {
      id: report.reporter.id,
      username: report.reporter.username,
      displayName: report.reporter.displayName,
      avatarUrl: report.reporter.avatarUrl,
    },
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    description: report.description,
    status: report.status,
    moderatorNotes: report.moderatorNotes,
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
  };
};

// -----------------------------------------------------------------------------
// Validate Target Exists
// -----------------------------------------------------------------------------

const validateTargetExists = async (targetType: string, targetId: string): Promise<void> => {
  let target: any = null;

  switch (targetType) {
    case 'USER':
      target = await prisma.user.findUnique({ where: { id: targetId } });
      break;
    case 'REEL':
      target = await prisma.reel.findUnique({ where: { id: targetId } });
      if (target?.deletedAt) target = null;
      break;
    case 'COMMENT':
      target = await prisma.comment.findUnique({ where: { id: targetId } });
      if (target?.deletedAt) target = null;
      break;
    case 'REVIEW':
      target = await prisma.review.findUnique({ where: { id: targetId } });
      if (target?.deletedAt) target = null;
      break;
    case 'PARTY':
      target = await prisma.party.findUnique({ where: { id: targetId } });
      if (target?.deletedAt) target = null;
      break;
  }

  if (!target) {
    throw new NotFoundError('Report target');
  }
};

// -----------------------------------------------------------------------------
// Create Report
// -----------------------------------------------------------------------------

export const createReport = async (
  reporterId: string,
  data: CreateReportRequest
): Promise<ReportResponse> => {
  // Can't report yourself
  if (data.targetType === 'USER' && data.targetId === reporterId) {
    throw new ForbiddenError('You cannot report yourself');
  }

  // Validate the target exists
  await validateTargetExists(data.targetType, data.targetId);

  // Prevent duplicate pending reports
  const existingReport = await prisma.report.findFirst({
    where: {
      reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      status: 'PENDING',
    },
  });

  if (existingReport) {
    throw new ConflictError('You already have a pending report for this target');
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      description: data.description,
    },
    include: {
      reporter: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return formatReport(report);
};

// -----------------------------------------------------------------------------
// List Reports (Admin)
// -----------------------------------------------------------------------------

export const listReports = async (
  status?: ReportStatus,
  cursor?: string,
  limit: number = 20
): Promise<{ reports: ReportResponse[]; nextCursor: string | null }> => {
  const reports = await prisma.report.findMany({
    where: {
      ...(status && { status }),
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const hasMore = reports.length > limit;
  const results = hasMore ? reports.slice(0, -1) : reports;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    reports: results.map((r) => formatReport(r)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Resolve Report (Admin)
// -----------------------------------------------------------------------------

export const resolveReport = async (
  reportId: string,
  data: ResolveReportRequest
): Promise<ReportResponse> => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status !== 'PENDING') {
    throw new ConflictError('Only pending reports can be resolved');
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: data.status,
      moderatorNotes: data.moderatorNotes,
      resolvedAt: new Date(),
    },
    include: {
      reporter: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  // If confirmed, deduct points from the target (USER or PARTY)
  if (data.status === 'CONFIRMED') {
    await deductReportPoints(report.targetType, report.targetId);
  }

  return formatReport(updatedReport);
};

// -----------------------------------------------------------------------------
// Helper: Deduct Points on Confirmed Report
// -----------------------------------------------------------------------------

const deductReportPoints = async (targetType: string, targetId: string): Promise<void> => {
  const points = POINT_WEIGHTS.REPORT_CONFIRMED;

  if (targetType === 'USER') {
    // Deduct points from all races the user is competing in
    const competitors = await prisma.raceCompetitor.findMany({
      where: { userId: targetId },
      select: { raceId: true },
    });

    await Promise.all(
      competitors.map((c) =>
        recordPointEvent({
          targetUserId: targetId,
          raceId: c.raceId,
          action: 'REPORT_CONFIRMED',
          points,
        }).catch(() => {}) // Don't fail report resolution on point errors
      )
    );
  } else if (targetType === 'PARTY') {
    // Deduct points from all races the party is competing in
    const competitors = await prisma.raceCompetitor.findMany({
      where: { partyId: targetId },
      select: { raceId: true },
    });

    await Promise.all(
      competitors.map((c) =>
        recordPointEvent({
          targetPartyId: targetId,
          raceId: c.raceId,
          action: 'REPORT_CONFIRMED',
          points,
        }).catch(() => {}) // Don't fail report resolution on point errors
      )
    );
  }
};
