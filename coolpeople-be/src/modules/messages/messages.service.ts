/**
 * Messages Service
 * Business logic for direct messaging
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { isBlocked } from '../blocking/blocking.service.js';
import { recordPointEvent } from '../points/points.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { POINT_WEIGHTS, DM_POINTS_DAILY_CAP } from '../../config/constants.js';
import type {
  ConversationResponse,
  ConversationUser,
  MessageResponse,
  MessageReaction,
  SendMessageRequest,
} from './messages.types.js';

// -----------------------------------------------------------------------------
// Helper: Format message reactions for API response
// -----------------------------------------------------------------------------

const formatMessageReactions = (
  reactions: Array<{ emoji: string; userId: string }>,
  currentUserId: string
): MessageReaction[] => {
  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, userIds: new Set<string>() };
    }
    acc[r.emoji].count++;
    acc[r.emoji].userIds.add(r.userId);
    return acc;
  }, {} as Record<string, { count: number; userIds: Set<string> }>);

  // Convert to array with reacted flag
  return Object.entries(grouped).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reacted: data.userIds.has(currentUserId),
  }));
};

// -----------------------------------------------------------------------------
// Helper: Format message for API response
// -----------------------------------------------------------------------------

const formatMessage = (message: any, currentUserId?: string): MessageResponse => ({
  id: message.id,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content,
  metadata: message.metadata,
  readAt: message.readAt,
  createdAt: message.createdAt,
  reactions: message.reactions && currentUserId
    ? formatMessageReactions(message.reactions, currentUserId)
    : undefined,
});

// -----------------------------------------------------------------------------
// List Conversations
// Groups messages by the other user with last message and unread count
// -----------------------------------------------------------------------------

export const getConversations = async (
  currentUserId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ conversations: ConversationResponse[]; nextCursor: string | null }> => {
  // Get IDs of messages the current user has deleted for themselves
  const deletedMessages = await prisma.deletedMessage.findMany({
    where: { userId: currentUserId },
    select: { messageId: true },
  });
  const deletedMessageIds = new Set(deletedMessages.map((d) => d.messageId));

  // Get all distinct users the current user has exchanged messages with
  // Include ALL messages first, then filter deleted ones after
  const sentMessages = await prisma.directMessage.findMany({
    where: { senderId: currentUserId },
    select: { id: true, receiverId: true },
  });

  const receivedMessages = await prisma.directMessage.findMany({
    where: { receiverId: currentUserId },
    select: { id: true, senderId: true },
  });

  // Filter out deleted messages and collect unique partner IDs
  const partnerIdsFromSent = new Set(
    sentMessages
      .filter((m) => !deletedMessageIds.has(m.id))
      .map((m) => m.receiverId)
  );
  const partnerIdsFromReceived = new Set(
    receivedMessages
      .filter((m) => !deletedMessageIds.has(m.id))
      .map((m) => m.senderId)
  );

  // Combine partner IDs from both sent and received (non-deleted) messages
  const partnerIds = new Set<string>([
    ...Array.from(partnerIdsFromSent),
    ...Array.from(partnerIdsFromReceived),
  ]);

  // Filter out blocked users
  const unblockedPartnerIds: string[] = [];
  for (const partnerId of Array.from(partnerIds)) {
    const blocked = await isBlocked(currentUserId, partnerId);
    if (!blocked) {
      unblockedPartnerIds.push(partnerId);
    }
  }

  // Build conversations with last message, unread count, and settings
  const conversations: ConversationResponse[] = [];

  // Convert Set to array for Prisma queries
  const deletedMessageIdsArray = Array.from(deletedMessageIds);

  // --- Include Party Group Chat ---
  // Check if user is in a party and include the party group chat
  const membership = await prisma.partyMembership.findFirst({
    where: { userId: currentUserId },
    include: {
      party: {
        include: {
          groupChat: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  user: {
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (membership?.party?.groupChat) {
    const party = membership.party;
    const groupChat = party.groupChat;
    const lastChatMessage = groupChat.messages[0];

    // Get conversation settings for party chat (using party.id as otherUserId)
    const partySettings = await prisma.conversationSettings.findUnique({
      where: {
        userId_otherUserId: { userId: currentUserId, otherUserId: party.id },
      },
    });

    // Create a party chat conversation entry
    const partyChatConversation: ConversationResponse = {
      id: `party-${party.id}`,
      partyId: party.id,
      isPartyChat: true,
      otherUser: {
        id: party.id,
        username: party.name,
        displayName: party.name,
        avatarUrl: party.avatarUrl,
      },
      lastMessage: lastChatMessage
        ? {
            id: lastChatMessage.id,
            senderId: lastChatMessage.userId,
            receiverId: party.id,
            content: lastChatMessage.content,
            metadata: null,
            readAt: null,
            createdAt: lastChatMessage.createdAt,
          }
        : {
            id: `party-welcome-${party.id}`,
            senderId: party.id,
            receiverId: currentUserId,
            content: `Welcome to ${party.name}!`,
            metadata: null,
            readAt: new Date(),
            createdAt: party.createdAt,
          },
      unreadCount: 0, // Party chat doesn't track individual read status
      isPinned: partySettings?.isPinned ?? false,
      isMuted: partySettings?.isMuted ?? false,
      isHidden: partySettings?.isHidden ?? false,
    };
    conversations.push(partyChatConversation);
  }
  // --- End Party Group Chat ---

  if (unblockedPartnerIds.length === 0 && conversations.length === 0) {
    return { conversations: [], nextCursor: null };
  }

  for (const partnerId of unblockedPartnerIds) {
    // Find last message that hasn't been deleted by the current user
    const lastMessage = await prisma.directMessage.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUserId },
        ],
        // Exclude deleted messages
        ...(deletedMessageIdsArray.length > 0 && { NOT: { id: { in: deletedMessageIdsArray } } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Skip this conversation if all messages have been deleted
    if (!lastMessage) continue;

    // Count unread messages (excluding deleted ones)
    const unreadCount = await prisma.directMessage.count({
      where: {
        senderId: partnerId,
        receiverId: currentUserId,
        readAt: null,
        // Exclude deleted messages
        ...(deletedMessageIdsArray.length > 0 && { NOT: { id: { in: deletedMessageIdsArray } } }),
      },
    });

    const otherUser = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    if (!otherUser) continue;

    // Get conversation settings (pinned, muted, hidden)
    const settings = await prisma.conversationSettings.findUnique({
      where: {
        userId_otherUserId: { userId: currentUserId, otherUserId: partnerId },
      },
    });

    conversations.push({
      otherUser: otherUser as ConversationUser,
      lastMessage: formatMessage(lastMessage),
      unreadCount,
      isPinned: settings?.isPinned ?? false,
      isMuted: settings?.isMuted ?? false,
      isHidden: settings?.isHidden ?? false,
    });
  }

  // Sort by most recent message (party chat will stay at top due to isPinned sorting in frontend)
  conversations.sort(
    (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
  );

  // Apply cursor-based pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = conversations.findIndex(
      (c) => c.lastMessage.id === cursor
    );
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginatedConversations = conversations.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedConversations.length > limit;
  const results = hasMore ? paginatedConversations.slice(0, -1) : paginatedConversations;
  const nextCursor = hasMore ? results[results.length - 1].lastMessage.id : null;

  return { conversations: results, nextCursor };
};

// -----------------------------------------------------------------------------
// Send Message
// -----------------------------------------------------------------------------

export const sendMessage = async (
  senderId: string,
  data: SendMessageRequest
): Promise<MessageResponse> => {
  const { receiverId, content, metadata } = data;

  // Can't DM yourself
  if (senderId === receiverId) {
    throw new ForbiddenError('You cannot send a message to yourself');
  }

  // Check receiver exists
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) throw new NotFoundError('User');

  // Check blocks
  const blocked = await isBlocked(senderId, receiverId);
  if (blocked) {
    throw new ForbiddenError('Cannot send message to this user');
  }

  // Create the message
  const message = await prisma.directMessage.create({
    data: {
      senderId,
      receiverId,
      content,
      metadata: metadata || undefined,
    },
  });

  // Emit real-time DM via WebSocket
  try {
    const io = getIO();
    if (io) {
      const ids = [senderId, receiverId].sort();
      const senderInfo = await prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      const receiverInfo = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      // Emit to receiver's personal room for conversation list update
      io.to(`user:${receiverId}`).emit('message:new', {
        conversationId: `${ids[0]}:${ids[1]}`,
        senderId,
        sender: senderInfo,
        message: { id: message.id, senderId, content, metadata: message.metadata, createdAt: message.createdAt },
      });

      // Emit to sender's personal room so their messages list updates too
      io.to(`user:${senderId}`).emit('message:new', {
        conversationId: `${ids[0]}:${ids[1]}`,
        senderId,
        sender: receiverInfo, // For the sender, show the receiver's info
        message: { id: message.id, senderId, content, metadata: message.metadata, createdAt: message.createdAt },
      });

      // Emit to conversation room for real-time chat view
      io.to(`conversation:${ids[0]}:${ids[1]}`).emit('conversation:message', {
        message: { id: message.id, senderId, content, metadata: message.metadata, createdAt: message.createdAt },
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }

  // Create DM notification
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true, avatarUrl: true },
  });
  createNotification({
    userId: receiverId,
    type: 'DM',
    title: 'New message',
    body: `${sender?.username ?? 'Someone'} sent you a message`,
    data: {
      senderId,
      actorUsername: sender?.username,
      actorAvatarUrl: sender?.avatarUrl,
    },
  }).catch(() => {});

  // Award DM_RECEIVED points to receiver (if under daily cap from this sender)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayDmPoints = await prisma.pointEvent.count({
    where: {
      action: 'DM_RECEIVED',
      sourceUserId: senderId,
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  if (todayDmPoints < DM_POINTS_DAILY_CAP) {
    // Get receiver's race competitors
    const competitors = await prisma.raceCompetitor.findMany({
      where: { userId: receiverId },
      select: { raceId: true },
    });

    // Award points in each race the receiver is competing in
    await Promise.all(
      competitors.map((c) =>
        recordPointEvent({
          targetUserId: receiverId,
          raceId: c.raceId,
          action: 'DM_RECEIVED',
          points: POINT_WEIGHTS.DM_RECEIVED,
          sourceUserId: senderId,
        }).catch(() => {}) // Don't fail message send on point errors
      )
    );
  }

  return formatMessage(message);
};

// -----------------------------------------------------------------------------
// Get Messages With User
// Returns messages between current user and specific user, sorted desc
// -----------------------------------------------------------------------------

export const getMessagesWithUser = async (
  currentUserId: string,
  otherUserId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ messages: MessageResponse[]; nextCursor: string | null }> => {
  // Verify the other user exists
  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!otherUser) throw new NotFoundError('User');

  // Check blocks
  const blocked = await isBlocked(currentUserId, otherUserId);
  if (blocked) {
    throw new ForbiddenError('Cannot view messages with this user');
  }

  // Get IDs of messages the current user has deleted for themselves
  const deletedMessages = await prisma.deletedMessage.findMany({
    where: { userId: currentUserId },
    select: { messageId: true },
  });
  const deletedMessageIds = deletedMessages.map((d) => d.messageId);

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
      // Exclude messages deleted by the current user
      ...(deletedMessageIds.length > 0 && { NOT: { id: { in: deletedMessageIds } } }),
    },
    include: {
      reactions: {
        select: {
          emoji: true,
          userId: true,
        },
      },
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    messages: results.map((msg) => formatMessage(msg, currentUserId)),
    nextCursor,
  };
};

// -----------------------------------------------------------------------------
// Mark Conversation as Read
// Marks all unread messages FROM the other user TO current user as read
// -----------------------------------------------------------------------------

export const markConversationRead = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.directMessage.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: currentUserId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

// -----------------------------------------------------------------------------
// Delete Own Message
// Only the sender can delete their own message
// -----------------------------------------------------------------------------

export const deleteMessage = async (
  messageId: string,
  userId: string
): Promise<void> => {
  const message = await prisma.directMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundError('Message');

  // User can delete any message in their conversation (for themselves only)
  if (message.senderId !== userId && message.receiverId !== userId) {
    throw new ForbiddenError('You can only delete messages from your conversations');
  }

  // Create a "deleted for me" record instead of actually deleting the message
  await prisma.deletedMessage.upsert({
    where: {
      userId_messageId: { userId, messageId },
    },
    update: {}, // Already deleted for this user
    create: {
      userId,
      messageId,
    },
  });
};

// -----------------------------------------------------------------------------
// Mark Conversation as Unread
// Marks the last N messages as unread by clearing readAt
// -----------------------------------------------------------------------------

export const markConversationUnread = async (
  currentUserId: string,
  otherUserId: string,
  count: number = 5
): Promise<void> => {
  // Get the last N messages from the other user
  const messages = await prisma.directMessage.findMany({
    where: {
      senderId: otherUserId,
      receiverId: currentUserId,
    },
    orderBy: { createdAt: 'desc' },
    take: count,
    select: { id: true },
  });

  if (messages.length > 0) {
    await prisma.directMessage.updateMany({
      where: {
        id: { in: messages.map((m) => m.id) },
      },
      data: {
        readAt: null,
      },
    });
  }
};

// -----------------------------------------------------------------------------
// Pin Conversation
// -----------------------------------------------------------------------------

export const pinConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isPinned: true },
    create: {
      userId: currentUserId,
      otherUserId,
      isPinned: true,
    },
  });
};

// -----------------------------------------------------------------------------
// Unpin Conversation
// -----------------------------------------------------------------------------

export const unpinConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isPinned: false },
    create: {
      userId: currentUserId,
      otherUserId,
      isPinned: false,
    },
  });
};

// -----------------------------------------------------------------------------
// Mute Conversation
// -----------------------------------------------------------------------------

export const muteConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isMuted: true },
    create: {
      userId: currentUserId,
      otherUserId,
      isMuted: true,
    },
  });
};

// -----------------------------------------------------------------------------
// Unmute Conversation
// -----------------------------------------------------------------------------

export const unmuteConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isMuted: false },
    create: {
      userId: currentUserId,
      otherUserId,
      isMuted: false,
    },
  });
};

// -----------------------------------------------------------------------------
// Hide Conversation
// -----------------------------------------------------------------------------

export const hideConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isHidden: true },
    create: {
      userId: currentUserId,
      otherUserId,
      isHidden: true,
    },
  });
};

// -----------------------------------------------------------------------------
// Unhide Conversation
// -----------------------------------------------------------------------------

export const unhideConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  await prisma.conversationSettings.upsert({
    where: {
      userId_otherUserId: { userId: currentUserId, otherUserId },
    },
    update: { isHidden: false },
    create: {
      userId: currentUserId,
      otherUserId,
      isHidden: false,
    },
  });
};

// -----------------------------------------------------------------------------
// Delete Conversation
// Deletes all messages between the two users
// -----------------------------------------------------------------------------

export const deleteConversation = async (
  currentUserId: string,
  otherUserId: string
): Promise<void> => {
  // Get all messages in this conversation
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    },
    select: { id: true },
  });

  // Mark all messages as deleted for the current user only (soft delete)
  // Use upsert to avoid duplicates
  await Promise.all(
    messages.map((msg) =>
      prisma.deletedMessage.upsert({
        where: {
          userId_messageId: { userId: currentUserId, messageId: msg.id },
        },
        update: {}, // Already deleted for this user
        create: {
          userId: currentUserId,
          messageId: msg.id,
        },
      })
    )
  );

  // Also delete conversation settings for this user only
  await prisma.conversationSettings.deleteMany({
    where: {
      userId: currentUserId,
      otherUserId,
    },
  });
};

// -----------------------------------------------------------------------------
// Add DM Reaction
// Adds a reaction to a direct message
// -----------------------------------------------------------------------------

export const addDmReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ reacted: boolean }> => {
  // Verify message exists and user is participant
  const message = await prisma.directMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundError('Message');

  // User must be sender or receiver
  if (message.senderId !== userId && message.receiverId !== userId) {
    throw new ForbiddenError('You can only react to messages in your conversations');
  }

  // Create the reaction (upsert to handle duplicates gracefully)
  await prisma.directMessageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
    update: {}, // Already exists, no update needed
    create: {
      messageId,
      userId,
      emoji,
    },
  });

  // Emit socket event for real-time sync
  try {
    const io = getIO();
    if (io) {
      const ids = [message.senderId, message.receiverId].sort();
      // Emit to conversation room
      io.to(`conversation:${ids[0]}:${ids[1]}`).emit('dm:reaction:added', {
        messageId,
        userId,
        emoji,
      });
      // Also emit to individual user rooms
      io.to(`user:${message.senderId}`).emit('dm:reaction:added', {
        messageId,
        userId,
        emoji,
      });
      io.to(`user:${message.receiverId}`).emit('dm:reaction:added', {
        messageId,
        userId,
        emoji,
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }

  return { reacted: true };
};

// -----------------------------------------------------------------------------
// Remove DM Reaction
// Removes a reaction from a direct message
// -----------------------------------------------------------------------------

export const removeDmReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  // Verify message exists and user is participant
  const message = await prisma.directMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundError('Message');

  // User must be sender or receiver
  if (message.senderId !== userId && message.receiverId !== userId) {
    throw new ForbiddenError('You can only remove your own reactions');
  }

  // Delete the reaction
  await prisma.directMessageReaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji,
    },
  });

  // Emit socket event for real-time sync
  try {
    const io = getIO();
    if (io) {
      const ids = [message.senderId, message.receiverId].sort();
      // Emit to conversation room
      io.to(`conversation:${ids[0]}:${ids[1]}`).emit('dm:reaction:removed', {
        messageId,
        userId,
        emoji,
      });
      // Also emit to individual user rooms
      io.to(`user:${message.senderId}`).emit('dm:reaction:removed', {
        messageId,
        userId,
        emoji,
      });
      io.to(`user:${message.receiverId}`).emit('dm:reaction:removed', {
        messageId,
        userId,
        emoji,
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }
};
