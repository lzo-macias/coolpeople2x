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
// POST /api/messages/conversations/:userId/unread
// -----------------------------------------------------------------------------

export const markConversationUnread = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  const { count } = req.body as { count?: number };
  await messagesService.markConversationUnread(req.user!.userId, otherUserId, count || 5);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/pin
// -----------------------------------------------------------------------------

export const pinConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.pinConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/pin
// -----------------------------------------------------------------------------

export const unpinConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.unpinConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/mute
// -----------------------------------------------------------------------------

export const muteConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.muteConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/mute
// -----------------------------------------------------------------------------

export const unmuteConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.unmuteConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/hide
// -----------------------------------------------------------------------------

export const hideConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.hideConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/hide
// -----------------------------------------------------------------------------

export const unhideConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.unhideConversation(req.user!.userId, otherUserId);
  sendNoContent(res);
};

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId
// -----------------------------------------------------------------------------

export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  const otherUserId = req.params.userId as string;
  await messagesService.deleteConversation(req.user!.userId, otherUserId);
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
