/**
 * Socket.io Client Service
 * Real-time communication with CoolPeople backend
 */

import { io } from 'socket.io-client'
import { getAuthToken } from './api'

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Event listeners storage for cleanup
const eventListeners = new Map()

/**
 * Initialize socket connection with authentication
 */
export const initializeSocket = () => {
  const token = getAuthToken()

  if (!token) {
    console.log('Socket: No auth token, skipping connection')
    return null
  }

  if (socket?.connected) {
    console.log('Socket: Already connected')
    return socket
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket: Connected')
    reconnectAttempts = 0
    // Setup auto-join for party rooms
    setupPartyRoomAutoJoin()
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket: Disconnected -', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket: Connection error -', error.message)
    reconnectAttempts++

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Socket: Max reconnection attempts reached')
    }
  })

  return socket
}

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    eventListeners.clear()
  }
}

/**
 * Get current socket instance
 */
export const getSocket = () => socket

/**
 * Check if socket is connected
 */
export const isConnected = () => socket?.connected ?? false

// =============================================================================
// Room Management
// =============================================================================

/**
 * Join a conversation room for real-time chat
 */
export const joinConversation = (otherUserId) => {
  if (socket?.connected) {
    socket.emit('join:conversation', otherUserId)
  }
}

/**
 * Leave a conversation room
 */
export const leaveConversation = (otherUserId) => {
  if (socket?.connected) {
    socket.emit('leave:conversation', otherUserId)
  }
}

/**
 * Join a race room for scoreboard updates
 */
export const joinRace = (raceId) => {
  if (socket?.connected) {
    socket.emit('join:race', raceId)
  }
}

/**
 * Leave a race room
 */
export const leaveRace = (raceId) => {
  if (socket?.connected) {
    socket.emit('leave:race', raceId)
  }
}

/**
 * Join a party room for group chat
 */
export const joinPartyRoom = (partyId) => {
  if (socket?.connected) {
    socket.emit('party:join:room', partyId)
  }
}

/**
 * Leave a party room
 */
export const leavePartyRoom = (partyId) => {
  if (socket?.connected) {
    socket.emit('party:leave:room', partyId)
  }
}

// =============================================================================
// Message Events
// =============================================================================

/**
 * Listen for new messages (for conversation list updates)
 * @param {Function} callback - Called when a new message arrives
 * @returns {Function} Cleanup function
 */
export const onNewMessage = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      conversationId: data.conversationId,
      senderId: data.senderId,
      sender: data.sender,
      message: {
        id: data.message.id,
        content: data.message.content,
        createdAt: new Date(data.message.createdAt),
      },
    })
  }

  socket.on('message:new', handler)
  eventListeners.set('message:new', handler)

  return () => {
    socket?.off('message:new', handler)
    eventListeners.delete('message:new')
  }
}

/**
 * Listen for conversation messages (for active chat view)
 * @param {Function} callback - Called when a message arrives in the joined conversation
 * @returns {Function} Cleanup function
 */
export const onConversationMessage = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      message: {
        id: data.message.id,
        senderId: data.message.senderId,
        content: data.message.content,
        createdAt: new Date(data.message.createdAt),
      },
    })
  }

  socket.on('conversation:message', handler)

  return () => {
    socket?.off('conversation:message', handler)
  }
}

/**
 * Listen for deleted messages
 * @param {Function} callback - Called when a message is deleted
 * @returns {Function} Cleanup function
 */
export const onMessageDeleted = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      messageId: data.messageId,
      senderId: data.senderId,
      receiverId: data.receiverId,
    })
  }

  socket.on('message:deleted', handler)
  eventListeners.set('message:deleted', handler)

  return () => {
    socket?.off('message:deleted', handler)
    eventListeners.delete('message:deleted')
  }
}

/**
 * Listen for typing indicators
 * @param {Function} callback - Called when typing status changes
 * @returns {Function} Cleanup function
 */
export const onTyping = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      userId: data.userId,
      isTyping: data.isTyping,
    })
  }

  socket.on('message:typing', handler)
  eventListeners.set('message:typing', handler)

  return () => {
    socket?.off('message:typing', handler)
    eventListeners.delete('message:typing')
  }
}

/**
 * Emit typing status
 */
export const emitTyping = (receiverId, isTyping) => {
  if (socket?.connected) {
    socket.emit('typing', { receiverId, isTyping })
  }
}

// =============================================================================
// Story Events
// =============================================================================

/**
 * Listen for new stories from followed users
 * @param {Function} callback - Called when a new story is posted
 * @returns {Function} Cleanup function
 */
export const onNewStory = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      id: data.id,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      createdAt: new Date(data.createdAt),
      expiresAt: new Date(data.expiresAt),
      user: data.user,
    })
  }

  socket.on('story:new', handler)
  eventListeners.set('story:new', handler)

  return () => {
    socket?.off('story:new', handler)
    eventListeners.delete('story:new')
  }
}

/**
 * Listen for story expiration
 * @param {Function} callback - Called when a story expires
 * @returns {Function} Cleanup function
 */
export const onStoryExpired = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      storyId: data.storyId,
      creatorId: data.creatorId,
    })
  }

  socket.on('story:expired', handler)
  eventListeners.set('story:expired', handler)

  return () => {
    socket?.off('story:expired', handler)
    eventListeners.delete('story:expired')
  }
}

// =============================================================================
// Activity/Notification Events
// =============================================================================

/**
 * Listen for new activity notifications
 * @param {Function} callback - Called when new activity occurs
 * @returns {Function} Cleanup function
 */
export const onNewActivity = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      type: data.type,
      actorId: data.actorId,
      actorUsername: data.actorUsername,
      actorAvatarUrl: data.actorAvatarUrl,
      actorParty: data.actorParty,
      targetId: data.targetId,
      targetType: data.targetType,
      reelId: data.reelId,
      thumbnailUrl: data.thumbnailUrl,
      commentText: data.commentText,
      createdAt: new Date(data.createdAt),
    })
  }

  socket.on('activity:new', handler)
  eventListeners.set('activity:new', handler)

  return () => {
    socket?.off('activity:new', handler)
    eventListeners.delete('activity:new')
  }
}

/**
 * Listen for general notifications
 * @param {Function} callback - Called when a notification arrives
 * @returns {Function} Cleanup function
 */
export const onNotification = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      id: data.id,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
      readAt: data.readAt,
      createdAt: new Date(data.createdAt),
    })
  }

  socket.on('notification', handler)
  eventListeners.set('notification', handler)

  return () => {
    socket?.off('notification', handler)
    eventListeners.delete('notification')
  }
}

// =============================================================================
// Scoreboard Events
// =============================================================================

/**
 * Listen for scoreboard updates in a race
 * @param {Function} callback - Called when scoreboard changes
 * @returns {Function} Cleanup function
 */
export const onScoreboardUpdate = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      raceId: data.raceId,
      userId: data.userId,
      partyId: data.partyId,
      points: data.points,
      rank: data.rank,
    })
  }

  socket.on('scoreboard:update', handler)
  eventListeners.set('scoreboard:update', handler)

  return () => {
    socket?.off('scoreboard:update', handler)
    eventListeners.delete('scoreboard:update')
  }
}

// =============================================================================
// Points Events
// =============================================================================

/**
 * Listen for real-time points updates in joined race rooms
 * @param {Function} callback - Called when points change for a competitor
 * @returns {Function} Cleanup function
 */
export const onPointsUpdate = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      raceId: data.raceId,
      competitorId: data.competitorId,
      newPoints: data.newPoints,
      newTier: data.newTier,
    })
  }

  socket.on('points:update', handler)

  return () => {
    socket?.off('points:update', handler)
  }
}

// =============================================================================
// Follow Events
// =============================================================================

/**
 * Listen for follow/unfollow updates (real-time follower count)
 * @param {Function} callback - Called when someone follows/unfollows you
 * @returns {Function} Cleanup function
 */
export const onFollowUpdate = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      follower: data.follower,
      isFollowing: data.isFollowing,
    })
  }

  socket.on('follow:update', handler)
  eventListeners.set('follow:update', handler)

  return () => {
    socket?.off('follow:update', handler)
    eventListeners.delete('follow:update')
  }
}

// =============================================================================
// User Status Events
// =============================================================================

/**
 * Listen for user online/offline status changes
 * @param {Function} callback - Called when a user's status changes
 * @returns {Function} Cleanup function
 */
export const onUserStatus = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      userId: data.userId,
      isOnline: data.isOnline,
    })
  }

  socket.on('user:status', handler)
  eventListeners.set('user:status', handler)

  return () => {
    socket?.off('user:status', handler)
    eventListeners.delete('user:status')
  }
}

// =============================================================================
// Party Chat Events
// =============================================================================

/**
 * Listen for party chat messages
 * @param {Function} callback - Called when a party message arrives
 * @returns {Function} Cleanup function
 */
export const onPartyMessage = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      partyId: data.partyId,
      message: {
        id: data.message.id,
        senderId: data.message.senderId,
        senderUsername: data.message.senderUsername,
        content: data.message.content,
        createdAt: new Date(data.message.createdAt),
      },
    })
  }

  socket.on('party:message', handler)
  eventListeners.set('party:message', handler)

  return () => {
    socket?.off('party:message', handler)
    eventListeners.delete('party:message')
  }
}

/**
 * Listen for new member joining party
 * @param {Function} callback - Called when a member joins
 * @returns {Function} Cleanup function
 */
export const onPartyMemberJoined = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      partyId: data.partyId,
      member: data.member,
    })
  }

  socket.on('party:member:joined', handler)
  eventListeners.set('party:member:joined', handler)

  return () => {
    socket?.off('party:member:joined', handler)
    eventListeners.delete('party:member:joined')
  }
}

/**
 * Listen for member leaving party
 * @param {Function} callback - Called when a member leaves
 * @returns {Function} Cleanup function
 */
export const onPartyMemberLeft = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      partyId: data.partyId,
      userId: data.userId,
    })
  }

  socket.on('party:member:left', handler)
  eventListeners.set('party:member:left', handler)

  return () => {
    socket?.off('party:member:left', handler)
    eventListeners.delete('party:member:left')
  }
}

/**
 * Setup auto-join for party rooms when server requests
 * Should be called after socket initialization
 */
export const setupPartyRoomAutoJoin = () => {
  if (!socket) return

  // When server tells us to join a party room (after joining a party)
  socket.on('party:join:room', (data) => {
    socket.emit('party:join:room', data.partyId)
    console.log('Socket: Auto-joined party room', data.partyId)
  })

  // When server tells us to leave a party room (after leaving a party)
  socket.on('party:leave:room', (data) => {
    socket.emit('party:leave:room', data.partyId)
    console.log('Socket: Auto-left party room', data.partyId)
  })
}

// =============================================================================
// User Groupchat Events
// =============================================================================

/**
 * Listen for user groupchat messages
 * @param {Function} callback - Called when a groupchat message arrives
 * @returns {Function} Cleanup function
 */
export const onGroupChatMessage = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      groupChatId: data.groupChatId,
      message: {
        id: data.id,
        content: data.content,
        createdAt: new Date(data.createdAt),
        user: data.user,
      },
    })
  }

  socket.on('groupchat:message', handler)
  eventListeners.set('groupchat:message', handler)

  return () => {
    socket?.off('groupchat:message', handler)
    eventListeners.delete('groupchat:message')
  }
}

// =============================================================================
// DM Reaction Events
// =============================================================================

/**
 * Listen for DM reaction added events
 * @param {Function} callback - Called when a reaction is added
 * @returns {Function} Cleanup function
 */
export const onDmReactionAdded = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
    })
  }

  socket.on('dm:reaction:added', handler)
  eventListeners.set('dm:reaction:added', handler)

  return () => {
    socket?.off('dm:reaction:added', handler)
    eventListeners.delete('dm:reaction:added')
  }
}

/**
 * Listen for DM reaction removed events
 * @param {Function} callback - Called when a reaction is removed
 * @returns {Function} Cleanup function
 */
export const onDmReactionRemoved = (callback) => {
  if (!socket) return () => {}

  const handler = (data) => {
    callback({
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
    })
  }

  socket.on('dm:reaction:removed', handler)
  eventListeners.set('dm:reaction:removed', handler)

  return () => {
    socket?.off('dm:reaction:removed', handler)
    eventListeners.delete('dm:reaction:removed')
  }
}

// =============================================================================
// Utility Exports
// =============================================================================

export default {
  initialize: initializeSocket,
  disconnect: disconnectSocket,
  get: getSocket,
  isConnected,

  // Room management
  joinConversation,
  leaveConversation,
  joinRace,
  leaveRace,
  joinPartyRoom,
  leavePartyRoom,

  // Event listeners
  onNewMessage,
  onMessageDeleted,
  onConversationMessage,
  onTyping,
  emitTyping,
  onNewStory,
  onStoryExpired,
  onNewActivity,
  onNotification,
  onScoreboardUpdate,
  onPointsUpdate,
  onFollowUpdate,
  onUserStatus,
  onPartyMessage,
  onPartyMemberJoined,
  onPartyMemberLeft,
  onGroupChatMessage,
  onDmReactionAdded,
  onDmReactionRemoved,
}
