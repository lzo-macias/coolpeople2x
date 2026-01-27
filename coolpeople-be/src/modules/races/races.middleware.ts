/**
 * Races Middleware
 * System race protection
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';

/**
 * Blocks modification of system races (CoolPeople, Best Party).
 * Must be placed after raceIdParamSchema validation.
 */
export const blockSystemRaceModification = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const raceId = req.params.id as string;

  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: { isSystemRace: true },
  });

  if (!race) {
    throw new NotFoundError('Race');
  }

  if (race.isSystemRace) {
    throw new ForbiddenError('System races cannot be modified or deleted');
  }

  next();
};
