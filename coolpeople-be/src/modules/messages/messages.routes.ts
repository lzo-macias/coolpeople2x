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
// POST /api/messages/conversations/:userId/unread
// Mark conversation as unread
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/conversations/:userId/unread',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.markConversationUnread
);

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/pin
// Pin a conversation
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/conversations/:userId/pin',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.pinConversation
);

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/pin
// Unpin a conversation
// -----------------------------------------------------------------------------

messagesRouter.delete(
  '/conversations/:userId/pin',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.unpinConversation
);

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/mute
// Mute a conversation
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/conversations/:userId/mute',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.muteConversation
);

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/mute
// Unmute a conversation
// -----------------------------------------------------------------------------

messagesRouter.delete(
  '/conversations/:userId/mute',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.unmuteConversation
);

// -----------------------------------------------------------------------------
// POST /api/messages/conversations/:userId/hide
// Hide a conversation
// -----------------------------------------------------------------------------

messagesRouter.post(
  '/conversations/:userId/hide',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.hideConversation
);

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId/hide
// Unhide a conversation
// -----------------------------------------------------------------------------

messagesRouter.delete(
  '/conversations/:userId/hide',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.unhideConversation
);

// -----------------------------------------------------------------------------
// DELETE /api/messages/conversations/:userId
// Delete entire conversation with a user
// -----------------------------------------------------------------------------

messagesRouter.delete(
  '/conversations/:userId',
  requireAuth,
  validate(conversationUserParamSchema),
  messagesController.deleteConversation
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
