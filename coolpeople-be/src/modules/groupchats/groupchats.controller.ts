/**
 * User Groupchats Controller
 * HTTP request handlers for user-created groupchats
 */

import { Request, Response, NextFunction } from 'express';
import * as groupchatsService from './groupchats.service.js';

// Create a new groupchat or get existing one with same members
export const createGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { memberIds, name } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'memberIds array is required',
      });
    }

    const groupChat = await groupchatsService.createGroupChat(userId, memberIds, name);

    res.status(201).json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    next(error);
  }
};

// Get all groupchats for the current user
export const getUserGroupChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChats = await groupchatsService.getUserGroupChats(userId);

    res.json({
      success: true,
      data: groupChats,
    });
  } catch (error) {
    next(error);
  }
};

// Update a groupchat (name, avatar)
export const updateGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;
    const { name, avatarUrl } = req.body;

    const groupChat = await groupchatsService.updateGroupChat(groupChatId, userId, { name, avatarUrl });

    res.json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific groupchat
export const getGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    const groupChat = await groupchatsService.getGroupChat(groupChatId, userId);

    res.json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    next(error);
  }
};

// Get messages for a groupchat
export const getGroupChatMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;
    const cursor = req.query.cursor as string | undefined;

    const result = await groupchatsService.getGroupChatMessages(groupChatId, userId, cursor);

    res.json({
      success: true,
      data: result.messages,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    next(error);
  }
};

// Send a message to a groupchat
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;
    const { content, metadata } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    const message = await groupchatsService.sendGroupChatMessage(groupChatId, userId, content, metadata);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// Find existing groupchat by members
export const findByMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        error: 'memberIds array is required',
      });
    }

    // Include current user in the search
    const allMemberIds = [...new Set([userId, ...memberIds])];
    const groupChatId = await groupchatsService.findGroupChatByMembers(allMemberIds);

    if (groupChatId) {
      const groupChat = await groupchatsService.getGroupChat(groupChatId, userId);
      res.json({
        success: true,
        exists: true,
        data: groupChat,
      });
    } else {
      res.json({
        success: true,
        exists: false,
        data: null,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Pin a groupchat
export const pinGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isPinned: true });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Unpin a groupchat
export const unpinGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isPinned: false });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Mute a groupchat
export const muteGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isMuted: true });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Unmute a groupchat
export const unmuteGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isMuted: false });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Hide a groupchat
export const hideGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isHidden: true });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Unhide a groupchat
export const unhideGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.updateMemberPreferences(groupChatId, userId, { isHidden: false });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Clear groupchat history (delete for user but stay as member)
export const clearGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.clearGroupChat(groupChatId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Leave a groupchat (stop receiving messages)
export const leaveGroupChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;

    await groupchatsService.leaveGroupChat(groupChatId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Add members to a groupchat
export const addMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'memberIds array is required',
      });
    }

    const groupChat = await groupchatsService.addMembers(groupChatId, userId, memberIds);

    res.json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    next(error);
  }
};

// Get suggested users to add to a groupchat
export const getSuggestedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const groupChatId = req.params.groupChatId as string | undefined;
    const search = req.query.search as string | undefined;

    const users = await groupchatsService.getSuggestedUsers(userId, groupChatId, search);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
