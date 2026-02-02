/**
 * Parties Middleware
 * Permission checking for party actions
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';
import type { PartyPermission } from '../../config/constants.js';

// -----------------------------------------------------------------------------
// Require Party Permission
// Factory middleware that checks if the authenticated user has a specific
// permission on the party identified by req.params.id
// -----------------------------------------------------------------------------

export const requirePartyPermission = (...requiredPermissions: PartyPermission[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const partyId = req.params.id as string;
    if (!partyId) {
      throw new NotFoundError('Party');
    }

    const membership = await prisma.partyMembership.findUnique({
      where: {
        userId_partyId: {
          userId: req.user.userId,
          partyId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this party');
    }

    // Leader or admin permission grants everything
    if (membership.permissions.includes('leader') || membership.permissions.includes('admin')) {
      return next();
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((p) =>
      membership.permissions.includes(p)
    );

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
};
