/**
 * Stories Controller
 * HTTP request handlers for story management
 */

import type { Request, Response } from 'express';
import * as storiesService from './stories.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// POST /api/stories
// -----------------------------------------------------------------------------

export const createStory = async (req: Request, res: Response): Promise<void> => {
  const story = await storiesService.createStory(req.user!.userId, req.body);
  sendCreated(res, { story });
};

// -----------------------------------------------------------------------------
// GET /api/stories/feed
// -----------------------------------------------------------------------------

export const getStoryFeed = async (req: Request, res: Response): Promise<void> => {
  const feed = await storiesService.getStoryFeed(req.user!.userId);
  sendSuccess(res, { storyFeed: feed });
};

// -----------------------------------------------------------------------------
// GET /api/stories/user/:userId
// -----------------------------------------------------------------------------

export const getUserStories = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId as string;
  const stories = await storiesService.getUserStories(userId, req.user?.userId);
  sendSuccess(res, { stories });
};

// -----------------------------------------------------------------------------
// GET /api/stories/:id
// -----------------------------------------------------------------------------

export const getStory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const story = await storiesService.getStory(id, req.user?.userId);
  sendSuccess(res, { story });
};

// -----------------------------------------------------------------------------
// DELETE /api/stories/:id
// -----------------------------------------------------------------------------

export const deleteStory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await storiesService.deleteStory(id, req.user!.userId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/stories/:id/view
// -----------------------------------------------------------------------------

export const viewStory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await storiesService.viewStory(id, req.user!.userId);
  sendSuccess(res, { viewed: true });
};
