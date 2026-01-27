/**
 * Messages Controller
 * HTTP request handlers for direct messaging
 */

import type { Request, Response } from 'express';
import * as messagesService from './messages.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';

// -----------------------------------------------------------------------------
// GET /api/messages/conversations
// -----------------------------------------------------------------------------

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await messagesService.getConversations(
    req.user!.userId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.conversations, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/messages
// -----------------------------------------------------------------------------

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const message = await messagesService.sendMessage(
    req.user!.userId,
    req.body
  );
  sendCreated(res, { message });
};

// -----------------------------------------------------------------------------
// GET /api/messages/conversations/:userId
// -----------------------------------------------------------------------------

export const getMessagesWithUser = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  const { cursor, limit } = req.query as { cursor?: string; limit: string };
  const result = await messagesService.getMessagesWithUser(
    req.user!.userId,
    otherUserId,
    cursor,
    parseInt(limit) || 20
  );
  sendPaginated(res, result.messages, {
    cursor: result.nextCursor ?? undefined,
    hasMore: !!result.nextCursor,
  });
};

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/read
// -----------------------------------------------------------------------------

export const markConversationRead = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.markConversationRead(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// DELETE /api/messages/:id
// -----------------------------------------------------------------------------

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  const messageId = req.params.id as string;
  await messagesService.deleteMessage(messageId, req.user!.userId);
  sendNoContent(res);
};
