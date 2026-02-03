/**
 * User Groupchats Routes
 * API endpoints for user-created groupchats
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './groupchats.controller.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/groupchats - Create a new groupchat
router.post('/', controller.createGroupChat);

// GET /api/groupchats - Get all groupchats for current user
router.get('/', controller.getUserGroupChats);

// POST /api/groupchats/find-by-members - Find existing groupchat by members
router.post('/find-by-members', controller.findByMembers);

// GET /api/groupchats/suggested-users - Get suggested users to add (followers, previously messaged)
router.get('/suggested-users', controller.getSuggestedUsers);

// GET /api/groupchats/:groupChatId - Get a specific groupchat
router.get('/:groupChatId', controller.getGroupChat);

// GET /api/groupchats/:groupChatId/messages - Get messages for a groupchat
router.get('/:groupChatId/messages', controller.getGroupChatMessages);

// POST /api/groupchats/:groupChatId/messages - Send a message to a groupchat
router.post('/:groupChatId/messages', controller.sendMessage);

// POST /api/groupchats/:groupChatId/pin - Pin a groupchat
router.post('/:groupChatId/pin', controller.pinGroupChat);

// DELETE /api/groupchats/:groupChatId/pin - Unpin a groupchat
router.delete('/:groupChatId/pin', controller.unpinGroupChat);

// POST /api/groupchats/:groupChatId/mute - Mute a groupchat
router.post('/:groupChatId/mute', controller.muteGroupChat);

// DELETE /api/groupchats/:groupChatId/mute - Unmute a groupchat
router.delete('/:groupChatId/mute', controller.unmuteGroupChat);

// POST /api/groupchats/:groupChatId/hide - Hide a groupchat
router.post('/:groupChatId/hide', controller.hideGroupChat);

// DELETE /api/groupchats/:groupChatId/hide - Unhide a groupchat
router.delete('/:groupChatId/hide', controller.unhideGroupChat);

// DELETE /api/groupchats/:groupChatId - Clear chat history (user stays as member, sees new messages)
router.delete('/:groupChatId', controller.clearGroupChat);

// DELETE /api/groupchats/:groupChatId/leave - Actually leave the groupchat (won't receive new messages)
router.delete('/:groupChatId/leave', controller.leaveGroupChat);

// POST /api/groupchats/:groupChatId/members - Add members to a groupchat
router.post('/:groupChatId/members', controller.addMembers);

// GET /api/groupchats/:groupChatId/suggested-users - Get suggested users excluding current members
router.get('/:groupChatId/suggested-users', controller.getSuggestedUsers);

export default router;
