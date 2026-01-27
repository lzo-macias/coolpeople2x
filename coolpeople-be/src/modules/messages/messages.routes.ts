/**
 * Messages Routes
 * Mounted at /api/messages
 */

import { Router } from 'express';
import * as messagesController from './messages.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  sendMessageSchema,
  conversationUserParamSchema,
  messageIdParamSchema,
  cursorQuerySchema,
} from './messages.schemas.js';

export const messagesRouter = Router();

// -----------------------------------------------------------------------------
// GET /api/messages/conversations
// List all conversations for the authenticated user
// -----------------------------------------------------------------------------

messagesRouter.get(
  '/conversations',
  requireAuth,
  validate(cursorQuerySchema),
  messagesController.getConversations
);

// -----------------------------------------------------------------------------
// POST /api/messages
// Send a direct message
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/',
  requireAuth,
  validate(sendMessageSchema),
  messagesController.sendMessage
);

// -----------------------------------------------------------------------------
// GET /api/messages/conversations/:userId
// Get messages with a specific user
// -----------------------------------------------------------------------------

messagesRouter.get(
  '/conversations/:userId',
  requireAuth,
  validate(conversationUserParamSchema),
  validate(cursorQuerySchema),
  messagesController.getMessagesWithUser
);

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/read
// Mark conversation with a specific user as read
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/conversations/:userId/read',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.markConversationRead
);

// -----------------------------------------------------------------------------
// DELETE /api/messages/:id
// Delete own message
// -----------------------------------------------------------------------------

messagesRouter.delete(
  '/:id',
  requireAuth,
  validate(messageIdParamSchema),
  messagesController.deleteMessage
);
