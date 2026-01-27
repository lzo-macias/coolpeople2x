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
  SendMessageRequest,
} from './messages.types.js';

// -----------------------------------------------------------------------------
// Helper: Format message for API response
// -----------------------------------------------------------------------------

const formatMessage = (message: any): MessageResponse => ({
  id: message.id,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content,
  readAt: message.readAt,
  createdAt: message.createdAt,
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
  // Get all distinct users the current user has exchanged messages with
  // We use raw query to group by conversation partner efficiently
  const sentMessages = await prisma.directMessage.findMany({
    where: { senderId: currentUserId },
    select: { receiverId: true },
    distinct: ['receiverId'],
  });

  const receivedMessages = await prisma.directMessage.findMany({
    where: { receiverId: currentUserId },
    select: { senderId: true },
    distinct: ['senderId'],
  });

  // Collect unique partner user IDs
  const partnerIds = new Set<string>();
  sentMessages.forEach((m) => partnerIds.add(m.receiverId));
  receivedMessages.forEach((m) => partnerIds.add(m.senderId));

  // Filter out blocked users
  const unblockedPartnerIds: string[] = [];
  for (const partnerId of partnerIds) {
    const blocked = await isBlocked(currentUserId, partnerId);
    if (!blocked) {
      unblockedPartnerIds.push(partnerId);
    }
  }

  if (unblockedPartnerIds.length === 0) {
    return { conversations: [], nextCursor: null };
  }

  // Build conversations with last message and unread count
  const conversations: ConversationResponse[] = [];

  for (const partnerId of unblockedPartnerIds) {
    const lastMessage = await prisma.directMessage.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastMessage) continue;

    const unreadCount = await prisma.directMessage.count({
      where: {
        senderId: partnerId,
        receiverId: currentUserId,
        readAt: null,
      },
    });

    const otherUser = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    if (!otherUser) continue;

    conversations.push({
      otherUser: otherUser as ConversationUser,
      lastMessage: formatMessage(lastMessage),
      unreadCount,
    });
  }

  // Sort by most recent message
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
  const { receiverId, content } = data;

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
    },
  });

  // Emit real-time DM via WebSocket
  try {
    const io = getIO();
    if (io) {
      const ids = [senderId, receiverId].sort();
      io.to(`user:${receiverId}`).emit('dm:message', {
        conversationId: `${ids[0]}:${ids[1]}`,
        message: { id: message.id, senderId, content, createdAt: message.createdAt },
      });
    }
  } catch {
    // Don't fail on WebSocket errors
  }

  // Create DM notification
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });
  createNotification({
    userId: receiverId,
    type: 'DM',
    title: 'New message',
    body: `${sender?.username ?? 'Someone'} sent you a message`,
    data: { senderId },
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

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    messages: results.map(formatMessage),
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

  if (message.senderId !== userId) {
    throw new ForbiddenError('You can only delete your own messages');
  }

  await prisma.directMessage.delete({
    where: { id: messageId },
  });
};
