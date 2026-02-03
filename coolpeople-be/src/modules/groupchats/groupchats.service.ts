/**
 * User Groupchats Service
 * Business logic for user-created groupchats (separate from party chats)
 */

import { prisma } from '../../lib/prisma.js';
import { getIO } from '../../lib/socket.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GroupChatResponse {
  id: string;
  name: string | null;
  createdById: string;
  createdAt: string;
  members: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
  };
  // User-specific preferences
  isPinned?: boolean;
  isMuted?: boolean;
  isHidden?: boolean;
  // Party info (if converted to party chat)
  partyId?: string | null;
  party?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    color?: string;
  } | null;
}

export interface GroupChatMessageResponse {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// -----------------------------------------------------------------------------
// Find existing groupchat with exact same members
// -----------------------------------------------------------------------------

export const findGroupChatByMembers = async (memberIds: string[]): Promise<string | null> => {
  // Sort member IDs for consistent comparison
  const sortedMemberIds = [...memberIds].sort();

  // Find all groupchats where the current user is a member
  const groupChats = await prisma.userGroupChat.findMany({
    where: {
      members: {
        some: {
          userId: { in: memberIds },
        },
      },
    },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  // Check each groupchat to see if it has exactly the same members
  for (const groupChat of groupChats) {
    const chatMemberIds = groupChat.members.map(m => m.userId).sort();

    // Check if arrays are equal
    if (chatMemberIds.length === sortedMemberIds.length &&
        chatMemberIds.every((id, index) => id === sortedMemberIds[index])) {
      return groupChat.id;
    }
  }

  return null;
};

// -----------------------------------------------------------------------------
// Create a new groupchat
// -----------------------------------------------------------------------------

export const createGroupChat = async (
  creatorId: string,
  memberIds: string[],
  name?: string
): Promise<GroupChatResponse> => {
  // Ensure creator is included in members
  const allMemberIds = [...new Set([creatorId, ...memberIds])];

  // Check if a groupchat with these exact members already exists
  const existingGroupChatId = await findGroupChatByMembers(allMemberIds);
  if (existingGroupChatId) {
    // Return the existing groupchat
    return getGroupChat(existingGroupChatId, creatorId);
  }

  // Create the groupchat with all members
  const groupChat = await prisma.userGroupChat.create({
    data: {
      name,
      createdById: creatorId,
      members: {
        create: allMemberIds.map(userId => ({ userId })),
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return {
    id: groupChat.id,
    name: groupChat.name,
    createdById: groupChat.createdById,
    createdAt: groupChat.createdAt.toISOString(),
    members: groupChat.members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
    })),
  };
};

// -----------------------------------------------------------------------------
// Get a groupchat by ID
// -----------------------------------------------------------------------------

export const getGroupChat = async (
  groupChatId: string,
  userId: string
): Promise<GroupChatResponse> => {
  const groupChat = await prisma.userGroupChat.findUnique({
    where: { id: groupChatId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
      party: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!groupChat) {
    throw new NotFoundError('Groupchat not found');
  }

  // Verify user is a member
  const isMember = groupChat.members.some(m => m.userId === userId);
  if (!isMember) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  const lastMessage = groupChat.messages[0];

  return {
    id: groupChat.id,
    name: groupChat.party?.name || groupChat.name, // Use party name if converted
    createdById: groupChat.createdById,
    createdAt: groupChat.createdAt.toISOString(),
    members: groupChat.members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
    })),
    lastMessage: lastMessage ? {
      id: lastMessage.id,
      content: lastMessage.content,
      createdAt: lastMessage.createdAt.toISOString(),
      user: {
        id: lastMessage.user.id,
        username: lastMessage.user.username,
        avatarUrl: lastMessage.user.avatarUrl,
      },
    } : undefined,
    partyId: groupChat.partyId,
    party: groupChat.party ? {
      id: groupChat.party.id,
      name: groupChat.party.name,
      handle: groupChat.party.handle,
      avatarUrl: groupChat.party.avatarUrl,
    } : null,
  };
};

// -----------------------------------------------------------------------------
// Get all groupchats for a user
// -----------------------------------------------------------------------------

export const getUserGroupChats = async (userId: string): Promise<GroupChatResponse[]> => {
  const memberships = await prisma.userGroupChatMember.findMany({
    where: {
      userId,
      leftAt: null, // Only get chats user hasn't left
    },
    include: {
      groupChat: {
        include: {
          members: {
            where: { leftAt: null }, // Only include active members
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50, // Get more messages to find the latest one after clearedAt
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          party: {
            select: {
              id: true,
              name: true,
              handle: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      groupChat: {
        updatedAt: 'desc',
      },
    },
  });

  // Filter and transform memberships
  const results: GroupChatResponse[] = [];

  for (const m of memberships) {
    const groupChat = m.groupChat;

    // Filter messages to only those after clearedAt (if set)
    const visibleMessages = m.clearedAt
      ? groupChat.messages.filter(msg => msg.createdAt > m.clearedAt!)
      : groupChat.messages;

    // If user cleared the chat and there are no new messages, don't show it
    if (m.clearedAt && visibleMessages.length === 0) {
      continue;
    }

    const lastMessage = visibleMessages[0];

    results.push({
      id: groupChat.id,
      name: groupChat.party?.name || groupChat.name, // Use party name if converted
      createdById: groupChat.createdById,
      createdAt: groupChat.createdAt.toISOString(),
      members: groupChat.members.map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
      })),
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        createdAt: lastMessage.createdAt.toISOString(),
        user: {
          id: lastMessage.user.id,
          username: lastMessage.user.username,
          avatarUrl: lastMessage.user.avatarUrl,
        },
      } : undefined,
      // Include user preferences
      isPinned: m.isPinned,
      isMuted: m.isMuted,
      isHidden: m.isHidden,
      // Include party info if converted
      partyId: groupChat.partyId,
      party: groupChat.party ? {
        id: groupChat.party.id,
        name: groupChat.party.name,
        handle: groupChat.party.handle,
        avatarUrl: groupChat.party.avatarUrl,
      } : null,
    });
  }

  return results;
};

// -----------------------------------------------------------------------------
// Get messages for a groupchat
// -----------------------------------------------------------------------------

export const getGroupChatMessages = async (
  groupChatId: string,
  userId: string,
  cursor?: string,
  limit = 50
): Promise<{ messages: GroupChatMessageResponse[]; nextCursor?: string }> => {
  // Verify user is a member
  const membership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  // Build where clause - filter by clearedAt if user has cleared their history
  const whereClause: { groupChatId: string; createdAt?: { gt: Date } } = { groupChatId };
  if (membership.clearedAt) {
    whereClause.createdAt = { gt: membership.clearedAt };
  }

  const messages = await prisma.userGroupChatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const resultMessages = hasMore ? messages.slice(0, -1) : messages;

  return {
    messages: resultMessages.map(m => ({
      id: m.id,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
      user: {
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
      },
    })),
    nextCursor: hasMore ? resultMessages[resultMessages.length - 1]?.id : undefined,
  };
};

// -----------------------------------------------------------------------------
// Send a message to a groupchat
// -----------------------------------------------------------------------------

export const sendGroupChatMessage = async (
  groupChatId: string,
  userId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<GroupChatMessageResponse> => {
  // Verify user is a member
  const membership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  // Create the message
  const message = await prisma.userGroupChatMessage.create({
    data: {
      groupChatId,
      userId,
      content,
      ...(metadata && { metadata }),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update groupchat's updatedAt
  await prisma.userGroupChat.update({
    where: { id: groupChatId },
    data: { updatedAt: new Date() },
  });

  // Get all members to notify via socket
  const groupChat = await prisma.userGroupChat.findUnique({
    where: { id: groupChatId },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  // Emit to all members via socket
  const io = getIO();
  if (io && groupChat) {
    const messageData = {
      id: message.id,
      groupChatId,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt.toISOString(),
      user: {
        id: message.user.id,
        username: message.user.username,
        displayName: message.user.displayName,
        avatarUrl: message.user.avatarUrl,
      },
    };

    // Emit to each member
    groupChat.members.forEach(member => {
      io.to(`user:${member.userId}`).emit('groupchat:message', messageData);
    });
  }

  return {
    id: message.id,
    content: message.content,
    metadata: message.metadata,
    createdAt: message.createdAt.toISOString(),
    user: {
      id: message.user.id,
      username: message.user.username,
      displayName: message.user.displayName,
      avatarUrl: message.user.avatarUrl,
    },
  };
};

// -----------------------------------------------------------------------------
// Update member preferences (pin, mute, hide)
// -----------------------------------------------------------------------------

export const updateMemberPreferences = async (
  groupChatId: string,
  userId: string,
  preferences: { isPinned?: boolean; isMuted?: boolean; isHidden?: boolean }
): Promise<void> => {
  const membership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  await prisma.userGroupChatMember.update({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
    data: preferences,
  });
};

// -----------------------------------------------------------------------------
// Clear groupchat history (user deletes chat but stays as member)
// -----------------------------------------------------------------------------

export const clearGroupChat = async (
  groupChatId: string,
  userId: string
): Promise<void> => {
  const membership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  // Set clearedAt - user won't see messages before this timestamp
  // but remains a member and will see new messages
  await prisma.userGroupChatMember.update({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
    data: {
      clearedAt: new Date(),
      isHidden: false, // Unhide if was hidden
    },
  });
};

// -----------------------------------------------------------------------------
// Leave groupchat (actually leave and stop receiving messages)
// -----------------------------------------------------------------------------

export const leaveGroupChat = async (
  groupChatId: string,
  userId: string
): Promise<void> => {
  const membership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  // Set leftAt - user is no longer a member
  await prisma.userGroupChatMember.update({
    where: {
      groupChatId_userId: { groupChatId, userId },
    },
    data: {
      leftAt: new Date(),
    },
  });
};

// -----------------------------------------------------------------------------
// Add members to an existing groupchat
// -----------------------------------------------------------------------------

export const addMembers = async (
  groupChatId: string,
  requesterId: string,
  memberIds: string[]
): Promise<GroupChatResponse> => {
  // Verify requester is a member
  const requesterMembership = await prisma.userGroupChatMember.findUnique({
    where: {
      groupChatId_userId: { groupChatId, userId: requesterId },
    },
  });

  if (!requesterMembership || requesterMembership.leftAt) {
    throw new ForbiddenError('Not a member of this groupchat');
  }

  // Get existing members
  const existingMembers = await prisma.userGroupChatMember.findMany({
    where: { groupChatId },
    select: { userId: true, leftAt: true },
  });

  const existingMemberIds = new Set(existingMembers.map(m => m.userId));
  const leftMemberIds = new Set(existingMembers.filter(m => m.leftAt).map(m => m.userId));

  // Add each new member
  for (const memberId of memberIds) {
    if (existingMemberIds.has(memberId) && !leftMemberIds.has(memberId)) {
      // Already an active member, skip
      continue;
    }

    if (leftMemberIds.has(memberId)) {
      // User left before, rejoin them
      await prisma.userGroupChatMember.update({
        where: {
          groupChatId_userId: { groupChatId, userId: memberId },
        },
        data: {
          leftAt: null,
          clearedAt: new Date(), // They won't see old messages
        },
      });
    } else {
      // New member
      await prisma.userGroupChatMember.create({
        data: {
          groupChatId,
          userId: memberId,
        },
      });
    }
  }

  // Emit socket event for new members
  const io = getIO();
  if (io) {
    for (const memberId of memberIds) {
      io.to(`user:${memberId}`).emit('groupchat:added', { groupChatId });
    }
  }

  return getGroupChat(groupChatId, requesterId);
};

// -----------------------------------------------------------------------------
// Get suggested users to add to a groupchat (followers, previously messaged)
// -----------------------------------------------------------------------------

export const getSuggestedUsers = async (
  userId: string,
  groupChatId?: string,
  search?: string,
  limit = 20
): Promise<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; source: string }[]> => {
  // Get existing members to exclude
  let existingMemberIds: Set<string> = new Set();
  if (groupChatId) {
    const existingMembers = await prisma.userGroupChatMember.findMany({
      where: { groupChatId, leftAt: null },
      select: { userId: true },
    });
    existingMemberIds = new Set(existingMembers.map(m => m.userId));
  }
  existingMemberIds.add(userId); // Exclude self

  const results: { id: string; username: string; displayName: string | null; avatarUrl: string | null; source: string }[] = [];
  const addedIds = new Set<string>();

  // 1. Get users from existing conversations (previously messaged)
  const conversations = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    select: {
      senderId: true,
      receiverId: true,
    },
    distinct: ['senderId', 'receiverId'],
    take: 50,
  });

  const conversationUserIds = new Set<string>();
  conversations.forEach(c => {
    if (c.senderId !== userId) conversationUserIds.add(c.senderId);
    if (c.receiverId !== userId) conversationUserIds.add(c.receiverId);
  });

  if (conversationUserIds.size > 0) {
    const conversationUsers = await prisma.user.findMany({
      where: {
        id: { in: Array.from(conversationUserIds) },
        ...(search && {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      take: limit,
    });

    for (const user of conversationUsers) {
      if (!existingMemberIds.has(user.id) && !addedIds.has(user.id)) {
        results.push({ ...user, source: 'messaged' });
        addedIds.add(user.id);
      }
    }
  }

  // 2. Get followers
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    take: limit,
  });

  for (const f of followers) {
    if (!existingMemberIds.has(f.follower.id) && !addedIds.has(f.follower.id)) {
      if (!search ||
          f.follower.username.toLowerCase().includes(search.toLowerCase()) ||
          f.follower.displayName?.toLowerCase().includes(search.toLowerCase())) {
        results.push({ ...f.follower, source: 'follower' });
        addedIds.add(f.follower.id);
      }
    }
  }

  // 3. Get following (people user follows)
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    take: limit,
  });

  for (const f of following) {
    if (!existingMemberIds.has(f.following.id) && !addedIds.has(f.following.id)) {
      if (!search ||
          f.following.username.toLowerCase().includes(search.toLowerCase()) ||
          f.following.displayName?.toLowerCase().includes(search.toLowerCase())) {
        results.push({ ...f.following, source: 'following' });
        addedIds.add(f.following.id);
      }
    }
  }

  // 4. If searching OR need more results, do a general user search
  if (results.length < limit) {
    const excludeIds = [...Array.from(addedIds), ...Array.from(existingMemberIds)];
    const searchResults = await prisma.user.findMany({
      where: {
        ...(search ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        id: { notIn: excludeIds },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: { createdAt: 'desc' }, // Show newest users first as suggestions
      take: limit - results.length,
    });

    for (const user of searchResults) {
      if (!existingMemberIds.has(user.id) && !addedIds.has(user.id)) {
        results.push({ ...user, source: search ? 'search' : 'suggested' });
        addedIds.add(user.id);
      }
    }
  }

  return results.slice(0, limit);
};
