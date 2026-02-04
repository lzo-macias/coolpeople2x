import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { mockMessages, getPartyColor } from '../data/mockData'
import { messagesApi, storiesApi, notificationsApi, searchApi, groupchatsApi } from '../services/api'
import {
  initializeSocket,
  disconnectSocket,
  onNewMessage,
  onNewStory,
  onStoryExpired,
  onNotification,
  onUserStatus,
  onPartyMessage,
  onGroupChatMessage,
  isConnected,
} from '../services/socket'
import Conversation from './Conversation'
import CreateScreen from './CreateScreen'
import '../styling/Messages.css'

// Stories will come from API - followed users and party members
const mockStories = []

// Mock activity data
const mockActivity = {
  likes: 0,
  comments: 0,
  reposts: 0,
  reviews: 0,
  nominates: 0,
  ballots: 0,
}

// Detailed activity notifications - empty, will be populated from API
const mockActivityNotifications = {
  likes: [],
  comments: [],
  reposts: [],
  reviews: [],
  nominates: [],
  ballots: [],
}

function Messages({ onConversationChange, conversations, setConversations, userStories, isCandidate = false, userParty = null, currentUser = null, startConversationWith = null, onConversationStarted, onViewReel, onViewComments, onOpenProfile, onOpenPartyProfile, isActive, onTrackActivity, onPartyCreatedFromGroupchat }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeConversation, setActiveConversation] = useState(null)
  const [viewingStory, setViewingStory] = useState(null) // { userIndex, storyIndex }
  const [showActivity, setShowActivity] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all') // 'all', 'likes', 'comments', 'reposts', 'reviews', 'nominates', 'ballots'
  const [showCompose, setShowCompose] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [composeMessage, setComposeMessage] = useState('')
  const [showLivePhoto, setShowLivePhoto] = useState(false)
  const storyTimerRef = useRef(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const touchStartX = useRef(0)
  const activeConversationRef = useRef(null) // Ref to track active conversation for socket handler
  const currentUsername = currentUser?.username || 'User'

  // State for API data
  const [messages, setMessages] = useState([])
  const [stories, setStories] = useState([])
  const [unpinnedConversations, setUnpinnedConversations] = useState(new Set()) // Track manually unpinned conversations
  const [pinnedConversations, setPinnedConversations] = useState(new Set()) // Track manually pinned conversations
  const [silencedConversations, setSilencedConversations] = useState(new Set()) // Track silenced conversations
  const [hiddenConversations, setHiddenConversations] = useState(new Set()) // Track hidden conversations
  const [longPressPopup, setLongPressPopup] = useState(null) // { message, position }
  const processedMessageIds = useRef(new Set()) // Track processed message IDs to prevent double-counting
  const [notifications, setNotifications] = useState({ likes: [], comments: [], reposts: [], reviews: [], nominates: [], ballots: [] })
  const [activity, setActivity] = useState({ likes: 0, comments: 0, reposts: 0, reviews: 0, nominates: 0, ballots: 0 })
  const [searchResults, setSearchResults] = useState([])

  // Helper to close activity screen and reset only the viewed category's count
  const closeActivityScreen = () => {
    // Reset only the category that was being viewed
    if (activityFilter !== 'all') {
      setActivity(prev => ({
        ...prev,
        [activityFilter]: 0
      }))
    } else {
      // If viewing "all", reset all counts
      setActivity({ likes: 0, comments: 0, reposts: 0, reviews: 0, nominates: 0, ballots: 0 })
    }
    setShowActivity(false)
  }

  // ============================================================================
  // REAL-TIME UPDATE HELPERS
  // ============================================================================

  // Check if a story is expired (older than 24 hours)
  const isStoryExpired = (story) => {
    if (!story.createdAt) return false
    const createdAt = new Date(story.createdAt)
    const now = new Date()
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60)
    return hoursDiff >= 24
  }

  // Filter out expired stories
  const filterExpiredStories = (storiesList) => {
    return storiesList.filter(story => !isStoryExpired(story))
  }

  // Sort messages by most recent
  const sortMessages = (messagesList) => {
    return [...messagesList].sort((a, b) => {
      // For party chats without messages, use joinedAt or current time to put them at top
      const aTime = a.lastMessageAt
        ? new Date(a.lastMessageAt)
        : (a.isPartyChat && a.joinedAt ? new Date(a.joinedAt) : new Date(0))
      const bTime = b.lastMessageAt
        ? new Date(b.lastMessageAt)
        : (b.isPartyChat && b.joinedAt ? new Date(b.joinedAt) : new Date(0))
      return bTime - aTime
    })
  }

  // Add a new message to the list (for real-time updates)
  const addNewMessage = (newMessage) => {
    setMessages(prev => {
      // Check if conversation already exists
      const existingIndex = prev.findIndex(m => m.id === newMessage.conversationId || m.user?.id === newMessage.senderId)
      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: newMessage.text,
          lastMessageAt: newMessage.createdAt,
          timestamp: formatTimestamp(newMessage.createdAt),
          hasUnread: newMessage.senderId !== currentUser?.id,
          unreadCount: (updated[existingIndex].unreadCount || 0) + (newMessage.senderId !== currentUser?.id ? 1 : 0),
        }
        return sortMessages(updated)
      }
      // New conversation - add to list
      return sortMessages([...prev, newMessage])
    })
  }

  // Add a new story (for real-time updates)
  const addNewStory = (newStory) => {
    setStories(prev => {
      // Check if we already have stories from this user
      const existingIndex = prev.findIndex(s => s.userId === newStory.userId)
      if (existingIndex >= 0) {
        // Add story to existing user's stories
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          stories: [newStory, ...(updated[existingIndex].stories || [])],
          hasUnread: true,
        }
        return updated
      }
      // New user story - add to beginning
      return [newStory, ...prev]
    })
  }

  // Add a new activity notification (for real-time updates)
  const addNewActivity = (type, notification) => {
    setNotifications(prev => ({
      ...prev,
      [type]: [notification, ...(prev[type] || [])],
    }))
    setActivity(prev => ({
      ...prev,
      [type]: (prev[type] || 0) + 1,
    }))
  }

  // ============================================================================
  // REAL-TIME UPDATES VIA SOCKET.IO
  // ============================================================================

  // Initialize socket connection and set up event listeners
  useEffect(() => {
    // Initialize socket connection
    initializeSocket()

    // Set up socket event listeners
    const cleanupNewMessage = onNewMessage((data) => {
      const messageId = data.message?.id

      // Deduplicate - prevent double-counting from multiple event sources
      if (messageId && processedMessageIds.current.has(messageId)) {
        return
      }
      if (messageId) {
        processedMessageIds.current.add(messageId)
        // Clean up old IDs after 10 seconds to prevent memory leak
        setTimeout(() => processedMessageIds.current.delete(messageId), 10000)
      }

      // Update conversation list with new message
      setMessages(prev => {
        // Find existing conversation - check both senderId and sender.id
        // (sender.id is the other user when receiving your own sent message)
        const existingIndex = prev.findIndex(m =>
          m.user?.id === data.senderId ||
          m.user?.id === data.sender?.id ||
          m.id === data.conversationId
        )

        // Check if this message is for the currently active conversation
        const isActiveConversation = activeConversationRef.current &&
          (activeConversationRef.current.user?.id === data.senderId ||
           activeConversationRef.current.user?.id === data.sender?.id ||
           activeConversationRef.current.id === data.conversationId)

        // Only increment unread count if message is not from current user AND not viewing that conversation
        const shouldIncrementUnread = data.senderId !== currentUser?.id && !isActiveConversation

        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: data.message.content,
            lastMessageAt: data.message.createdAt,
            timestamp: formatTimestamp(data.message.createdAt),
            hasUnread: shouldIncrementUnread ? true : updated[existingIndex].hasUnread,
            unreadCount: shouldIncrementUnread
              ? (updated[existingIndex].unreadCount || 0) + 1
              : updated[existingIndex].unreadCount,
          }
          return sortMessages(updated)
        }

        // New conversation
        if (data.sender) {
          return sortMessages([...prev, {
            id: data.conversationId,
            user: {
              id: data.sender.id,
              username: data.sender.username || data.sender.displayName,
              avatar: data.sender.avatarUrl,
              party: data.sender.party,
            },
            lastMessage: data.message.content,
            lastMessageAt: data.message.createdAt,
            timestamp: formatTimestamp(data.message.createdAt),
            unreadCount: shouldIncrementUnread ? 1 : 0,
            hasUnread: shouldIncrementUnread,
            isOnline: false,
            isPinned: false,
            isMuted: false,
            isHidden: false,
            isPartyChat: false,
            partyId: null,
          }])
        }

        return prev
      })
    })

    const cleanupNewStory = onNewStory((story) => {
      // Add new story to the stories list
      setStories(prev => {
        const existingIndex = prev.findIndex(s => s.user?.id === story.user.id)

        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            stories: [story, ...(updated[existingIndex].stories || [])],
            hasUnread: true,
          }
          return updated
        }

        // New user story
        return [{
          id: story.id,
          userId: story.user.id,
          username: story.user.username || story.user.displayName,
          avatar: story.user.avatarUrl,
          hasUnread: true,
          party: story.user.party,
          stories: [story],
          createdAt: story.createdAt,
        }, ...prev]
      })
    })

    const cleanupStoryExpired = onStoryExpired(({ storyId, creatorId }) => {
      // Remove expired story
      setStories(prev => {
        return prev.map(userStories => {
          if (userStories.userId === creatorId || userStories.user?.id === creatorId) {
            const filteredStories = (userStories.stories || []).filter(s => s.id !== storyId)
            if (filteredStories.length === 0) return null
            return { ...userStories, stories: filteredStories }
          }
          return userStories
        }).filter(Boolean)
      })
    })

    // Note: We only use onNotification, not onNewActivity, to avoid duplicate notifications
    const cleanupNotification = onNotification((notification) => {
      // Handle real-time notifications - this is the main event for activity updates
      console.log('New notification received:', notification)

      // Map notification type to category
      const typeMap = {
        LIKE: 'likes',
        COMMENT_LIKE: 'likes',
        COMMENT: 'comments',
        COMMENT_REPLY: 'comments',
        REPOST: 'reposts',
        REVIEW: 'reviews',
        NOMINATE: 'nominates',
        BALLOT: 'ballots',
      }
      const category = typeMap[notification.type]

      if (category) {
        // Parse data field - might be string or object
        let actorData = notification.data || {}
        if (typeof actorData === 'string') {
          try {
            actorData = JSON.parse(actorData)
          } catch (e) {
            actorData = {}
          }
        }

        // Build content based on type
        let content = getActivityContent(notification.type)
        if ((notification.type === 'COMMENT' || notification.type === 'COMMENT_REPLY') && actorData.commentText) {
          content = `commented: "${actorData.commentText}"`
        }
        if (notification.type === 'COMMENT_LIKE') {
          content = 'liked your comment'
        }

        const newNotification = {
          id: notification.id || `${notification.type}-${Date.now()}`,
          actorId: actorData.actorId,
          reelId: actorData.reelId,
          reel: actorData.reelId ? {
            id: actorData.reelId,
            thumbnail: actorData.thumbnailUrl,
            videoUrl: actorData.videoUrl || null,
          } : null,
          user: {
            id: actorData.actorId,
            username: actorData.actorUsername,
            avatar: actorData.actorAvatarUrl,
            party: actorData.actorParty || null,
          },
          content,
          timestamp: formatTimestamp(notification.createdAt),
          postImage: actorData.thumbnailUrl,
        }

        setNotifications(prev => ({
          ...prev,
          [category]: [newNotification, ...(prev[category] || [])],
        }))

        setActivity(prev => ({
          ...prev,
          [category]: (prev[category] || 0) + 1,
        }))
      }
    })

    const cleanupUserStatus = onUserStatus(({ userId, isOnline }) => {
      // Update online status in messages list
      setMessages(prev => prev.map(m => {
        if (m.user?.id === userId) {
          return { ...m, isOnline }
        }
        return m
      }))
    })

    const cleanupPartyMessage = onPartyMessage(({ partyId, message }) => {
      // Update party chat in messages list
      setMessages(prev => {
        const partyChat = prev.find(m => m.partyId === partyId || m.isPartyChat)
        if (partyChat) {
          // Check if the party chat is currently active
          const isActiveConversation = activeConversationRef.current &&
            (activeConversationRef.current.partyId === partyId || activeConversationRef.current.isPartyChat)

          const shouldIncrementUnread = message.senderId !== currentUser?.id && !isActiveConversation

          return sortMessages(prev.map(m => {
            if (m.partyId === partyId || m.isPartyChat) {
              return {
                ...m,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                timestamp: formatTimestamp(message.createdAt),
                hasUnread: shouldIncrementUnread ? true : m.hasUnread,
                unreadCount: shouldIncrementUnread ? (m.unreadCount || 0) + 1 : m.unreadCount,
              }
            }
            return m
          }))
        }
        return prev
      })
    })

    const cleanupGroupChatMessage = onGroupChatMessage(async ({ groupChatId, message }) => {
      // Update or create user groupchat in messages list
      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.groupChatId === groupChatId)

        // Check if this groupchat is currently active
        const isActiveConversation = activeConversationRef.current &&
          activeConversationRef.current.groupChatId === groupChatId

        const shouldIncrementUnread = message.user?.id !== currentUser?.id && !isActiveConversation

        if (existingIndex >= 0) {
          // Update existing groupchat
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageAt: message.createdAt,
            timestamp: formatTimestamp(message.createdAt),
            hasUnread: shouldIncrementUnread ? true : updated[existingIndex].hasUnread,
            unreadCount: shouldIncrementUnread ? (updated[existingIndex].unreadCount || 0) + 1 : updated[existingIndex].unreadCount,
          }
          return sortMessages(updated)
        }

        // Groupchat not found in list - fetch it from API and add it
        // This happens when you receive a message from a new groupchat you were added to
        groupchatsApi.get(groupChatId).then(response => {
          const gc = response.data
          if (!gc) return

          const recipients = gc.members.filter(m => m.id !== currentUser?.id)
          const newGroupChat = {
            id: `groupchat-${gc.id}`,
            groupChatId: gc.id,
            isGroupChat: true,
            recipients: recipients,
            allMembers: gc.members, // All members including current user
            createdById: gc.createdById, // Creator of the groupchat
            party: gc.party, // Party info if converted
            user: {
              id: gc.id,
              username: recipients.map(m => m.username).join(', '),
              avatar: gc.party?.avatarUrl || recipients[0]?.avatarUrl,
              displayName: gc.name || gc.party?.name || `${gc.members.length} people`,
            },
            lastMessage: message.content,
            lastMessageAt: message.createdAt,
            timestamp: formatTimestamp(message.createdAt),
            unreadCount: shouldIncrementUnread ? 1 : 0,
            hasUnread: shouldIncrementUnread,
            isOnline: false,
            isPinned: gc.isPinned || false,
            isMuted: gc.isMuted || false,
            isHidden: gc.isHidden || false,
          }

          setMessages(current => {
            // Double check it wasn't added while we were fetching
            if (current.some(m => m.groupChatId === groupChatId)) return current
            return sortMessages([...current, newGroupChat])
          })
        }).catch(err => {
          console.error('Failed to fetch groupchat:', err)
        })

        return prev
      })
    })

    // Cleanup on unmount
    return () => {
      cleanupNewMessage()
      cleanupNewStory()
      cleanupStoryExpired()
      cleanupNotification()
      cleanupUserStatus()
      cleanupPartyMessage()
      cleanupGroupChatMessage()
    }
  }, [currentUser?.id, userParty])

  // Helper function to get activity content text
  const getActivityContent = (type) => {
    switch (type) {
      case 'LIKE': return 'liked your post'
      case 'COMMENT': return 'commented on your post'
      case 'REPOST': return 'reposted your content'
      case 'REVIEW': return 'left you a review'
      case 'NOMINATE': return 'nominated you'
      case 'BALLOT': return 'added you to their ballot'
      default: return 'interacted with your content'
    }
  }

  // Initial data fetch (one-time, not polling)
  useEffect(() => {
    const fetchInitialData = async () => {
      let allConversations = []
      const pinned = new Set()
      const muted = new Set()
      const hidden = new Set()

      // Fetch regular DM conversations
      try {
        const conversationsRes = await messagesApi.getConversations()
        if (conversationsRes.data && conversationsRes.data.length > 0) {
          const transformedMessages = conversationsRes.data.map(conv => {
            const convId = conv.id || `conv-${conv.otherUser?.id}`

            // Track pinned, muted, hidden conversations
            if (conv.isPinned) pinned.add(convId)
            if (conv.isMuted) muted.add(convId)
            if (conv.isHidden) hidden.add(convId)

            return {
              id: convId,
              partyId: conv.partyId,
              isPartyChat: conv.isPartyChat || false,
              joinedAt: conv.joinedAt, // For party chats - used for sorting new chats to top
              user: {
                id: conv.otherUser?.id,
                username: conv.otherUser?.username || conv.otherUser?.displayName,
                avatar: conv.otherUser?.avatarUrl,
                party: conv.otherUser?.party || null,
              },
              lastMessage: conv.lastMessage?.content || conv.lastMessage?.text || '',
              lastMessageAt: conv.lastMessage?.createdAt,
              timestamp: formatTimestamp(conv.lastMessage?.createdAt),
              unreadCount: conv.unreadCount || 0,
              isOnline: conv.otherUser?.isOnline || false,
              hasUnread: conv.unreadCount > 0,
              isPinned: conv.isPinned || false,
              isMuted: conv.isMuted || false,
              isHidden: conv.isHidden || false,
            }
          })
          allConversations = [...allConversations, ...transformedMessages]
        }
      } catch (error) {
        console.log('Failed to fetch conversations:', error.message)
      }

      // Fetch user groupchats
      try {
        const groupchatsRes = await groupchatsApi.getAll()
        if (groupchatsRes.data && groupchatsRes.data.length > 0) {
          const transformedGroupchats = groupchatsRes.data.map(gc => {
            // Filter out current user from recipients
            const recipients = gc.members.filter(m => m.id !== currentUser?.id)
            const gcId = `groupchat-${gc.id}`

            // Track pinned, muted, hidden groupchats
            if (gc.isPinned) pinned.add(gcId)
            if (gc.isMuted) muted.add(gcId)
            if (gc.isHidden) hidden.add(gcId)

            return {
              id: gcId,
              groupChatId: gc.id,
              isGroupChat: true,
              recipients: recipients,
              allMembers: gc.members, // All members including current user
              createdById: gc.createdById, // Creator of the groupchat
              party: gc.party, // Party info if converted
              partyId: gc.partyId || gc.party?.id, // Party ID for membership check
              user: {
                id: gc.id,
                username: recipients.map(m => m.username).join(', '),
                avatar: gc.party?.avatarUrl || recipients[0]?.avatarUrl,
                displayName: gc.name || gc.party?.name || `${gc.members.length} people`,
              },
              lastMessage: gc.lastMessage?.content || '',
              lastMessageAt: gc.lastMessage?.createdAt,
              timestamp: formatTimestamp(gc.lastMessage?.createdAt),
              unreadCount: 0,
              isOnline: false,
              hasUnread: false,
              isPinned: gc.isPinned || false,
              isMuted: gc.isMuted || false,
              isHidden: gc.isHidden || false,
            }
          })
          allConversations = [...allConversations, ...transformedGroupchats]
        }
      } catch (error) {
        console.log('Failed to fetch groupchats:', error.message)
      }

      // Set all conversations
      if (allConversations.length > 0) {
        setMessages(sortMessages(allConversations))
        setPinnedConversations(pinned)
        setSilencedConversations(muted)
        setHiddenConversations(hidden)
      }

      try {
        // Fetch stories
        const storiesRes = await storiesApi.getFeed()
        if (storiesRes.data) {
          const validStories = filterExpiredStories(storiesRes.data)
          setStories(validStories)
        }
      } catch (error) {
        console.log('Failed to fetch stories:', error.message)
      }

      try {
        // Fetch notifications
        const notificationsRes = await notificationsApi.getNotifications()
        console.log('Raw notifications response:', notificationsRes)
        // Backend returns { success: true, data: [...notifications] } or { notifications: [...] }
        const notificationsList = notificationsRes.data || notificationsRes.notifications || []
        console.log('Notifications list:', notificationsList)
        if (notificationsList && notificationsList.length > 0) {
          // Log first notification to debug data structure
          console.log('First notification:', notificationsList[0])
          console.log('First notification data field:', notificationsList[0]?.data)

          // Helper to parse data field (might be string or object)
          const parseNotificationData = (n) => {
            if (!n.data) return {}
            if (typeof n.data === 'string') {
              try {
                return JSON.parse(n.data)
              } catch (e) {
                return {}
              }
            }
            return n.data
          }

          // Actor info is stored in n.data object (actorId, actorUsername, actorAvatarUrl, etc.)
          const grouped = {
            likes: notificationsList.filter(n => n.type === 'LIKE' || n.type === 'COMMENT_LIKE').map(n => {
              const data = parseNotificationData(n)
              const isCommentLike = n.type === 'COMMENT_LIKE'
              return {
                id: n.id,
                actorId: data.actorId,
                reelId: data.reelId,
                commentId: data.commentId || null,
                reel: {
                  id: data.reelId,
                  thumbnail: data.thumbnailUrl,
                  videoUrl: data.videoUrl || null,
                },
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: isCommentLike ? 'liked your comment' : 'liked your post',
                timestamp: formatTimestamp(n.createdAt),
                postImage: data.thumbnailUrl,
                isCommentLike,
              }
            }),
            comments: notificationsList.filter(n => n.type === 'COMMENT' || n.type === 'COMMENT_REPLY').map(n => {
              const data = parseNotificationData(n)
              return {
                id: n.id,
                actorId: data.actorId,
                reelId: data.reelId,
                reel: {
                  id: data.reelId,
                  thumbnail: data.thumbnailUrl,
                  videoUrl: data.videoUrl || null,
                },
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: data.commentText ? `commented: "${data.commentText}"` : 'commented on your post',
                timestamp: formatTimestamp(n.createdAt),
                postImage: data.thumbnailUrl,
              }
            }),
            reposts: notificationsList.filter(n => n.type === 'REPOST').map(n => {
              const data = parseNotificationData(n)
              return {
                id: n.id,
                actorId: data.actorId,
                reelId: data.reelId,
                reel: {
                  id: data.reelId,
                  thumbnail: data.thumbnailUrl,
                  videoUrl: data.videoUrl || null,
                },
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: 'reposted your content',
                timestamp: formatTimestamp(n.createdAt),
                postImage: data.thumbnailUrl,
              }
            }),
            reviews: notificationsList.filter(n => n.type === 'REVIEW').map(n => {
              const data = parseNotificationData(n)
              return {
                id: n.id,
                actorId: data.actorId,
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: `left you a ${data.rating || 5}-star review`,
                timestamp: formatTimestamp(n.createdAt),
                rating: data.rating,
              }
            }),
            nominates: notificationsList.filter(n => n.type === 'NOMINATE').map(n => {
              const data = parseNotificationData(n)
              return {
                id: n.id,
                actorId: data.actorId,
                reelId: data.reelId,
                reel: {
                  id: data.reelId,
                  thumbnail: data.thumbnailUrl,
                  videoUrl: data.videoUrl || null,
                },
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: 'nominated you',
                timestamp: formatTimestamp(n.createdAt),
                postImage: data.thumbnailUrl,
              }
            }),
            ballots: notificationsList.filter(n => n.type === 'BALLOT').map(n => {
              const data = parseNotificationData(n)
              return {
                id: n.id,
                actorId: data.actorId,
                user: {
                  id: data.actorId,
                  username: data.actorUsername,
                  avatar: data.actorAvatarUrl,
                  party: data.actorParty
                },
                content: 'added you to their ballot',
                timestamp: formatTimestamp(n.createdAt),
              }
            }),
          }
          setNotifications(grouped)
          // Don't set activity counts from initial fetch - they represent "unread" counts
          // Only new notifications via socket should increment these
        }
      } catch (error) {
        console.log('Failed to fetch notifications:', error.message)
      }
    }

    fetchInitialData()

    // Set up a timer to check for expired stories every minute (client-side expiry check)
    const expiryCheckInterval = setInterval(() => {
      setStories(prev => filterExpiredStories(prev))
    }, 60000)

    return () => clearInterval(expiryCheckInterval)
  }, [userParty])

  // Handle starting a conversation with a specific user (from profile "Message" button)
  useEffect(() => {
    if (!startConversationWith) return

    // Validate that we have a valid user ID
    if (!startConversationWith.id) {
      console.error('Cannot start conversation: no valid user ID', startConversationWith)
      onConversationStarted?.()
      return
    }

    console.log('Starting conversation with user:', startConversationWith)

    // Find existing conversation with this user
    const existingConversation = messages.find(m =>
      m.user?.id === startConversationWith.id ||
      m.userId === startConversationWith.id
    )

    if (existingConversation) {
      // Open existing conversation
      console.log('Found existing conversation:', existingConversation)
      setActiveConversation(existingConversation)
      onConversationChange?.(true)
    } else {
      // Create a new conversation object and open it
      const newConversation = {
        id: `new-${startConversationWith.id}`,
        user: {
          id: startConversationWith.id,
          username: startConversationWith.username,
          avatar: startConversationWith.avatar,
          displayName: startConversationWith.displayName || startConversationWith.username,
        },
        userId: startConversationWith.id,
        username: startConversationWith.username,
        avatar: startConversationWith.avatar,
        lastMessage: '',
        timestamp: 'now',
        unreadCount: 0,
        hasUnread: false,
        isOnline: false,
        isNew: true, // Flag to indicate this is a new conversation
      }
      console.log('Creating new conversation:', newConversation)
      setActiveConversation(newConversation)
      onConversationChange?.(true)
    }

    // Clear the target user
    onConversationStarted?.()
  }, [startConversationWith, messages, onConversationChange, onConversationStarted])

  // Handle compose search
  useEffect(() => {
    if (!composeSearch || composeSearch.length < 2) {
      setSearchResults([])
      return
    }

    const searchTimer = setTimeout(async () => {
      try {
        const response = await searchApi.search(composeSearch, { type: 'users' })
        if (response.data?.users) {
          setSearchResults(response.data.users)
        }
      } catch (error) {
        console.log('Search error:', error.message)
      }
    }, 300)

    return () => clearTimeout(searchTimer)
  }, [composeSearch])

  // Helper function to format timestamps
  const formatTimestamp = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const hiddenCount = hiddenConversations.size
  const visibleMessages = messages.filter(m => !hiddenConversations.has(m.id))
  const unreadCount = visibleMessages.filter(m => m.hasUnread).length
  const totalCount = visibleMessages.length

  const filters = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'hidden', label: 'Hidden', count: hiddenCount > 0 ? hiddenCount : null },
    { id: 'requests', label: 'Requests', count: null },
  ]

  // Filter and sort messages by most recent
  const filteredMessages = sortMessages(messages.filter((msg) => {
    // Hidden filter shows only hidden messages
    if (activeFilter === 'hidden') return hiddenConversations.has(msg.id)
    // Other filters exclude hidden messages
    if (hiddenConversations.has(msg.id)) return false
    if (activeFilter === 'unread') return msg.hasUnread
    if (activeFilter === 'party') return msg.isPartyChat || (msg.partyId != null && msg.partyId === userParty?.id)
    return true
  }))

  const handleOpenConversation = async (message) => {
    // Reset unread count for this conversation when opened
    setMessages(prev => prev.map(m =>
      m.id === message.id
        ? { ...m, unreadCount: 0, hasUnread: false }
        : m
    ))
    const openedConversation = { ...message, unreadCount: 0, hasUnread: false }
    setActiveConversation(openedConversation)
    activeConversationRef.current = openedConversation // Update ref for socket handler
    onConversationChange?.(true)

    // Persist read status to backend
    if (message.user?.id) {
      try {
        await messagesApi.markConversationRead(message.user.id)
      } catch (error) {
        console.log('Failed to mark conversation as read:', error.message)
      }
    }
  }

  const handleCloseConversation = () => {
    setActiveConversation(null)
    activeConversationRef.current = null // Clear ref when closing conversation
    onConversationChange?.(false)
  }

  // Wrapper to also update messages list when party is created from groupchat
  const handlePartyCreatedFromGroupchat = async (partyData, groupChatId, memberIds) => {
    const result = await onPartyCreatedFromGroupchat?.(partyData, groupChatId, memberIds)
    if (result?.success) {
      // Update messages list with the new party data
      setMessages(prev => prev.map(m => {
        if (m.groupChatId === groupChatId || m.id === `groupchat-${groupChatId}`) {
          return {
            ...m,
            party: {
              id: result.party?.id,
              name: partyData.name,
              handle: partyData.handle,
              avatarUrl: partyData.photo,
              color: partyData.color,
            },
            user: {
              ...m.user,
              displayName: partyData.name,
            },
          }
        }
        return m
      }))
      // Update active conversation if it's the one that was converted
      if (activeConversation && (activeConversation.groupChatId === groupChatId || activeConversation.id === `groupchat-${groupChatId}`)) {
        setActiveConversation(prev => ({
          ...prev,
          party: {
            id: result.party?.id,
            name: partyData.name,
            handle: partyData.handle,
            avatarUrl: partyData.photo,
            color: partyData.color,
          },
          user: {
            ...prev.user,
            displayName: partyData.name,
          },
        }))
      }
    }
    return result
  }

  const handleUnpin = async (message, e) => {
    e.stopPropagation() // Prevent opening the conversation
    const messageId = message.id
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === messageId || m.user?.id === userId ? { ...m, isPinned: false } : m
    ))
    setUnpinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.add(messageId)
      if (userId) newSet.add(`conv-${userId}`)
      return newSet
    })
    setPinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(messageId)
      if (userId) newSet.delete(`conv-${userId}`)
      return newSet
    })

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.unpin(groupChatId)
      } else if (userId) {
        await messagesApi.unpinConversation(userId)
      }
    } catch (error) {
      console.log('Failed to unpin conversation:', error.message)
    }
  }

  const handleUnmute = async (message, e) => {
    e.stopPropagation() // Prevent opening the conversation
    const messageId = message.id
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isMuted: false } : m
    ))
    setSilencedConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(messageId)
      return newSet
    })

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.unmute(groupChatId)
      } else if (userId) {
        await messagesApi.unmuteConversation(userId)
      }
    } catch (error) {
      console.log('Failed to unmute conversation:', error.message)
    }
  }

  // Long press popup handlers
  const handleLongPress = (message, rect) => {
    setLongPressPopup({ message, rect })
  }

  const closeLongPressPopup = () => {
    setLongPressPopup(null)
  }

  const handleMarkUnread = async (message) => {
    const userId = message.user?.id
    if (!userId) return

    // Update local state immediately
    const unreadCount = 5
    setMessages(prev => prev.map(m =>
      m.id === message.id
        ? { ...m, unreadCount, hasUnread: true }
        : m
    ))
    closeLongPressPopup()

    // Persist to backend
    try {
      await messagesApi.markConversationUnread(userId, unreadCount)
    } catch (error) {
      console.log('Failed to mark as unread:', error.message)
    }
  }

  const handlePin = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === message.id || m.user?.id === userId ? { ...m, isPinned: true } : m
    ))
    setPinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.add(message.id)
      if (userId) newSet.add(`conv-${userId}`)
      return newSet
    })
    setUnpinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(message.id)
      if (userId) newSet.delete(`conv-${userId}`)
      return newSet
    })
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.pin(groupChatId)
      } else if (userId) {
        await messagesApi.pinConversation(userId)
      }
    } catch (error) {
      console.log('Failed to pin conversation:', error.message)
    }
  }

  const handleUnpinFromPopup = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === message.id || m.user?.id === userId ? { ...m, isPinned: false } : m
    ))
    setUnpinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.add(message.id)
      if (userId) newSet.add(`conv-${userId}`)
      return newSet
    })
    setPinnedConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(message.id)
      if (userId) newSet.delete(`conv-${userId}`)
      return newSet
    })
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.unpin(groupChatId)
      } else if (userId) {
        await messagesApi.unpinConversation(userId)
      }
    } catch (error) {
      console.log('Failed to unpin conversation:', error.message)
    }
  }

  const handleSilence = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    const isCurrentlyMuted = silencedConversations.has(message.id) || message.isMuted

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, isMuted: !isCurrentlyMuted } : m
    ))
    setSilencedConversations(prev => {
      const newSet = new Set(prev)
      if (isCurrentlyMuted) {
        newSet.delete(message.id)
      } else {
        newSet.add(message.id)
      }
      return newSet
    })
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        if (isCurrentlyMuted) {
          await groupchatsApi.unmute(groupChatId)
        } else {
          await groupchatsApi.mute(groupChatId)
        }
      } else if (userId) {
        if (isCurrentlyMuted) {
          await messagesApi.unmuteConversation(userId)
        } else {
          await messagesApi.muteConversation(userId)
        }
      }
    } catch (error) {
      console.log('Failed to toggle mute:', error.message)
    }
  }

  const handleDeleteConversation = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Remove from local state immediately
    setMessages(prev => prev.filter(m => m.id !== message.id))
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.leave(groupChatId)
      } else if (userId) {
        await messagesApi.deleteConversation(userId)
      }
    } catch (error) {
      console.log('Failed to delete conversation:', error.message)
    }
  }

  const handleHide = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, isHidden: true } : m
    ))
    setHiddenConversations(prev => {
      const newSet = new Set(prev)
      newSet.add(message.id)
      return newSet
    })
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.hide(groupChatId)
      } else if (userId) {
        await messagesApi.hideConversation(userId)
      }
    } catch (error) {
      console.log('Failed to hide conversation:', error.message)
    }
  }

  const handleUnhide = async (message) => {
    const userId = message.user?.id
    const isGroupChat = message.isGroupChat
    const groupChatId = message.groupChatId

    // Update local state immediately
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, isHidden: false } : m
    ))
    setHiddenConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(message.id)
      return newSet
    })
    closeLongPressPopup()

    // Persist to backend
    try {
      if (isGroupChat && groupChatId) {
        await groupchatsApi.unhide(groupChatId)
      } else if (userId) {
        await messagesApi.unhideConversation(userId)
      }
    } catch (error) {
      console.log('Failed to unhide conversation:', error.message)
    }
  }

  // Get stories users (excluding 'add'), including user's own stories
  const userStoryItems = (userStories || []).map((story, idx) => ({
    id: `user-story-${idx}`,
    username: 'Your Story',
    avatar: story.image,
    hasUnread: false,
    party: story.party,
    isOwnStory: true,
    stories: [{
      id: story.id,
      image: story.videoUrl || story.image,
      videoUrl: story.videoUrl,
      timestamp: 'Just now',
      taggedUser: story.taggedUser,
    }]
  }))

  // Combine user stories with mock stories
  const allStoryUsers = [...userStoryItems, ...mockStories.filter(s => !s.isAdd)]
  const storyUsers = allStoryUsers

  // Story navigation handlers
  const openStory = (userIndex, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setViewingStory({ userIndex, storyIndex: 0 })
    setStoryProgress(0)
  }

  const closeStory = () => {
    if (storyTimerRef.current) clearInterval(storyTimerRef.current)
    setViewingStory(null)
    setStoryProgress(0)
  }

  const nextStory = () => {
    if (!viewingStory) return
    const currentUser = storyUsers[viewingStory.userIndex]
    if (viewingStory.storyIndex < currentUser.stories.length - 1) {
      setViewingStory({ ...viewingStory, storyIndex: viewingStory.storyIndex + 1 })
      setStoryProgress(0)
    } else if (viewingStory.userIndex < storyUsers.length - 1) {
      setViewingStory({ userIndex: viewingStory.userIndex + 1, storyIndex: 0 })
      setStoryProgress(0)
    } else {
      closeStory()
    }
  }

  const prevStory = () => {
    if (!viewingStory) return
    if (viewingStory.storyIndex > 0) {
      setViewingStory({ ...viewingStory, storyIndex: viewingStory.storyIndex - 1 })
      setStoryProgress(0)
    } else if (viewingStory.userIndex > 0) {
      const prevUser = storyUsers[viewingStory.userIndex - 1]
      setViewingStory({ userIndex: viewingStory.userIndex - 1, storyIndex: prevUser.stories.length - 1 })
      setStoryProgress(0)
    }
  }

  // Story auto-advance timer
  useEffect(() => {
    if (viewingStory) {
      storyTimerRef.current = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            nextStory()
            return 0
          }
          return prev + 2
        })
      }, 100)
      return () => clearInterval(storyTimerRef.current)
    }
  }, [viewingStory?.userIndex, viewingStory?.storyIndex])

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextStory()
      else prevStory()
    }
  }

  // Handle when a message is sent from a new conversation
  const handleMessageSent = (data) => {
    // Add the new conversation to the messages list
    setMessages(prev => {
      // Check if conversation already exists
      const existingIndex = prev.findIndex(m =>
        m.id === data.conversationId ||
        m.user?.id === data.user?.id ||
        (data.groupChatId && m.groupChatId === data.groupChatId)
      )

      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          id: data.conversationId,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
          timestamp: formatTimestamp(data.lastMessageAt),
        }
        return sortMessages(updated)
      }

      // Add new conversation to the list
      if (data.isGroupChat && data.groupChatId) {
        // Groupchat conversation
        return sortMessages([...prev, {
          id: data.conversationId,
          groupChatId: data.groupChatId,
          isGroupChat: true,
          recipients: data.recipients || [],
          user: data.user,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
          timestamp: formatTimestamp(data.lastMessageAt),
          unreadCount: 0,
          hasUnread: false,
          isOnline: false,
          isPinned: false,
          isMuted: false,
          isHidden: false,
        }])
      } else {
        // Regular DM conversation
        return sortMessages([...prev, {
          id: data.conversationId,
          user: data.user,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
          timestamp: formatTimestamp(data.lastMessageAt),
          unreadCount: 0,
          hasUnread: false,
          isOnline: false,
          isPinned: false,
          isMuted: false,
          isHidden: false,
          isPartyChat: false,
          partyId: null,
        }])
      }
    })

    // Update the active conversation with the real ID if it was a new conversation
    if (data.isNew) {
      setActiveConversation(prev => ({
        ...prev,
        id: data.conversationId,
        isNew: false,
      }))
    }
  }

  // Debug log every render
  console.log('=== MESSAGES COMPONENT RENDER ===', {
    hasActiveConversation: !!activeConversation,
    activeConversationUser: activeConversation?.user?.username,
    activeConversationId: activeConversation?.id,
    startConversationWith: startConversationWith?.username,
  })

  // Handle creating a new groupchat from party settings
  const handleCreateGroupChat = async (selectedMembers) => {
    console.log('Creating groupchat with members:', selectedMembers)

    try {
      // Call API to create groupchat (or get existing one with same members)
      const memberIds = selectedMembers.map(m => m.id)
      const response = await groupchatsApi.create(memberIds)
      const groupChat = response.data

      console.log('Groupchat created/found:', groupChat)

      // Filter out current user from recipients (for header display)
      const recipients = groupChat.members.filter(m => m.id !== currentUser?.id)

      // Create conversation object for the groupchat
      const groupChatConversation = {
        id: `groupchat-${groupChat.id}`,
        groupChatId: groupChat.id,
        isNew: !groupChat.lastMessage, // New if no messages yet
        isGroupChat: true,
        recipients: recipients,
        allMembers: groupChat.members, // All members including current user
        createdById: groupChat.createdById, // Creator of the groupchat
        party: groupChat.party, // Party info if converted
        // For display purposes
        user: {
          id: groupChat.id,
          username: recipients.map(m => m.username).join(', '),
          avatar: groupChat.party?.avatarUrl || recipients[0]?.avatarUrl,
          displayName: groupChat.name || groupChat.party?.name || `${groupChat.members.length} people`,
        },
        lastMessage: groupChat.lastMessage?.content || '',
        lastMessageAt: groupChat.lastMessage?.createdAt,
        timestamp: formatTimestamp(groupChat.lastMessage?.createdAt),
        unreadCount: 0,
        hasUnread: false,
        isOnline: false,
        isPinned: false,
        isMuted: false,
        isHidden: false,
      }

      // Add groupchat to messages list if not already present
      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.groupChatId === groupChat.id)
        if (existingIndex >= 0) {
          // Already exists, just return as-is
          return prev
        }
        // Add new groupchat to the list
        return sortMessages([...prev, groupChatConversation])
      })

      setActiveConversation(groupChatConversation)
      activeConversationRef.current = groupChatConversation
      onConversationChange?.(true)
    } catch (error) {
      console.error('Failed to create groupchat:', error)
    }
  }

  // Show conversation view if one is selected
  if (activeConversation) {
    console.log('>>> RENDERING CONVERSATION COMPONENT with user:', activeConversation.user?.username)
    return (
      <Conversation
        conversation={activeConversation}
        onBack={handleCloseConversation}
        sharedConversations={conversations}
        setSharedConversations={setConversations}
        onMessageSent={handleMessageSent}
        currentUserId={currentUser?.id}
        currentUserAvatar={currentUser?.avatar}
        onCreateGroupChat={handleCreateGroupChat}
        onPartyCreatedFromGroupchat={handlePartyCreatedFromGroupchat}
        onOpenProfile={onOpenProfile}
        onOpenPartyProfile={onOpenPartyProfile}
      />
    )
  }

  console.log('>>> RENDERING MESSAGES LIST (no active conversation)')

  // Render Story Viewer as a portal
  const renderStoryViewer = () => {
    if (!viewingStory) return null

    const currentUser = storyUsers[viewingStory.userIndex]
    if (!currentUser) return null

    const currentStory = currentUser.stories[viewingStory.storyIndex]
    const partyColor = getPartyColor(currentUser.party)

    return createPortal(
      <div
        className="story-viewer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress bars */}
        <div className="story-progress-container">
          {currentUser.stories.map((_, idx) => (
            <div key={idx} className="story-progress-bar">
              <div
                className="story-progress-fill"
                style={{
                  width: idx < viewingStory.storyIndex ? '100%' :
                         idx === viewingStory.storyIndex ? `${storyProgress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-user-info">
            <div className="story-avatar" style={{ borderColor: partyColor }}>
              <img src={currentUser.avatar} alt={currentUser.username} />
            </div>
            <span className="story-username">{currentUser.username}</span>
            <span className="story-timestamp">{currentStory.timestamp}</span>
          </div>
          <button className="story-close-btn" onClick={closeStory}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story content */}
        <div className="story-content">
          {currentStory.videoUrl ? (
            <video
              src={currentStory.videoUrl}
              autoPlay
              loop
              playsInline
              muted
            />
          ) : (
            <img src={currentStory.image} alt="Story" />
          )}
          {currentStory.taggedUser && (
            <div className="story-tagged-user">
              @{currentStory.taggedUser.username || currentStory.taggedUser.name || currentStory.taggedUser.phone}
            </div>
          )}
        </div>

        {/* Navigation zones */}
        <div className="story-nav-zones">
          <div className="story-nav-left" onClick={prevStory} />
          <div className="story-nav-right" onClick={nextStory} />
        </div>

        {/* Story actions */}
        <div className="story-actions">
          <input type="text" placeholder="Send message..." className="story-reply-input" />
          <button className="story-action-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button className="story-action-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Render Activity Screen as a portal
  const renderActivityScreen = () => {
    if (!showActivity) return null

    // Use API notifications only - no mock fallback
    const activityNotifications = {
      likes: notifications.likes || [],
      comments: notifications.comments || [],
      reposts: notifications.reposts || [],
      reviews: notifications.reviews || [],
      nominates: notifications.nominates || [],
      ballots: notifications.ballots || [],
    }

    const allNotifications = [
      ...activityNotifications.likes.map(n => ({ ...n, type: 'like' })),
      ...activityNotifications.comments.map(n => ({ ...n, type: 'comment' })),
      ...activityNotifications.reposts.map(n => ({ ...n, type: 'repost' })),
      ...activityNotifications.reviews.map(n => ({ ...n, type: 'review' })),
      ...activityNotifications.nominates.map(n => ({ ...n, type: 'nominate' })),
      ...activityNotifications.ballots.map(n => ({ ...n, type: 'ballot' })),
    ].sort((a, b) => {
      // Sort by most recent first (smallest time value = most recent)
      const timeToMinutes = (t) => {
        if (!t) return 0
        if (t.includes('m')) return parseInt(t) || 0
        if (t.includes('h')) return (parseInt(t) || 0) * 60
        if (t.includes('d')) return (parseInt(t) || 0) * 60 * 24
        return 0
      }
      return timeToMinutes(a.timestamp) - timeToMinutes(b.timestamp)
    })

    const getFilteredNotifications = () => {
      switch (activityFilter) {
        case 'likes': return activityNotifications.likes.map(n => ({ ...n, type: 'like' }))
        case 'comments': return activityNotifications.comments.map(n => ({ ...n, type: 'comment' }))
        case 'reposts': return activityNotifications.reposts.map(n => ({ ...n, type: 'repost' }))
        case 'reviews': return activityNotifications.reviews.map(n => ({ ...n, type: 'review' }))
        case 'nominates': return activityNotifications.nominates.map(n => ({ ...n, type: 'nominate' }))
        case 'ballots': return activityNotifications.ballots.map(n => ({ ...n, type: 'ballot' }))
        default: return allNotifications
      }
    }

    const filteredNotifications = getFilteredNotifications()

    return createPortal(
      <div className="activity-screen">
        <div className="activity-screen-header">
          <button className="activity-back-btn" onClick={() => closeActivityScreen()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2>Activity</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Activity filters */}
        <div className="activity-filters">
          {['all', 'likes', 'comments', 'reposts', 'reviews', 'nominates', 'ballots'].map(filter => (
            <button
              key={filter}
              className={`activity-filter-btn ${activityFilter === filter ? 'active' : ''}`}
              onClick={() => setActivityFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="activity-notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="activity-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p>No activity yet</p>
              <span>When people interact with your content, you'll see it here</span>
            </div>
          ) : (
            filteredNotifications.map(notification => {
              const partyColor = getPartyColor(notification.user?.party)

              // Handle clicking on the notification row (excluding username)
              const handleNotificationClick = (e) => {
                // Don't navigate if clicking on username
                if (e.target.closest('.activity-notification-username')) return

                if (notification.type === 'comment' && notification.reel) {
                  // For comments, go to comment section
                  onViewComments?.(notification.reel)
                  closeActivityScreen()
                } else if (notification.isCommentLike && notification.reel) {
                  // For comment likes, go to comment section so they can see the comment
                  onViewComments?.(notification.reel)
                  closeActivityScreen()
                } else if (notification.reelId && notification.reel) {
                  // For likes/reposts/nominates, go to the reel
                  onViewReel?.(notification.reel)
                  closeActivityScreen()
                }
              }

              // Handle clicking on username
              const handleUsernameClick = (e) => {
                e.stopPropagation()
                if (notification.user?.id) {
                  onOpenProfile?.({
                    id: notification.user.id,
                    username: notification.user.username,
                    avatar: notification.user.avatar,
                    party: notification.user.party,
                  })
                  closeActivityScreen()
                }
              }

              return (
                <div
                  key={notification.id}
                  className="activity-notification-item"
                  onClick={handleNotificationClick}
                  style={{ cursor: notification.reelId ? 'pointer' : 'default' }}
                >
                  <div className="activity-notification-avatar" style={{ borderColor: partyColor }}>
                    <img src={notification.user?.avatar} alt={notification.user?.username} />
                    <div className={`activity-notification-icon ${notification.type}`}>
                      {notification.type === 'like' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      )}
                      {notification.type === 'comment' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      )}
                      {notification.type === 'repost' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 17v-7h3l-4-4-4 4h3v9h10v-2H7zm10-10v7h-3l4 4 4-4h-3V5H9v2h8z"/>
                        </svg>
                      )}
                      {notification.type === 'review' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                      )}
                      {notification.type === 'nominate' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                      {notification.type === 'ballot' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1zm2-11H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="activity-notification-content">
                    <p>
                      <strong
                        className="activity-notification-username"
                        onClick={handleUsernameClick}
                        style={{ cursor: 'pointer' }}
                      >
                        {notification.user?.username}
                      </strong> {notification.content}
                    </p>
                    <span className="activity-notification-time">{notification.timestamp}</span>
                  </div>
                  {notification.postImage && (
                    <img src={notification.postImage} alt="" className="activity-notification-post" />
                  )}
                  {notification.rating && (
                    <div className="activity-notification-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= notification.rating ? '#FFD700' : '#444'}>
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>,
      document.body
    )
  }

  // All users for compose search
  const allUsers = messages.map(m => m.user)

  // Filter users based on search - prefer API results when available
  const filteredUsers = composeSearch.trim()
    ? (searchResults.length > 0
        ? searchResults.map(u => ({
            id: u.id,
            username: u.username || u.displayName,
            avatar: u.avatarUrl,
            party: u.party,
          }))
        : allUsers.filter(user =>
            user.username.toLowerCase().includes(composeSearch.toLowerCase())
          ))
    : allUsers

  // Toggle recipient selection
  const toggleRecipient = (user) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.username === user.username)
      if (exists) {
        return prev.filter(r => r.username !== user.username)
      }
      return [...prev, user]
    })
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (selectedRecipients.length > 0 && composeMessage.trim()) {
      const messageContent = composeMessage
      try {
        // Send message to each recipient
        const sendPromises = selectedRecipients.map(recipient =>
          messagesApi.sendMessage({
            receiverId: recipient.id,
            content: messageContent,
          })
        )
        await Promise.all(sendPromises)

        // Add conversations to the list for each recipient
        selectedRecipients.forEach(recipient => {
          handleMessageSent({
            conversationId: `conv-${recipient.id}`,
            user: recipient,
            lastMessage: messageContent,
            lastMessageAt: new Date().toISOString(),
            isNew: true,
          })
        })
      } catch (error) {
        console.log('Error sending message:', error.message)
      }
      // Reset and close
      setSelectedRecipients([])
      setComposeMessage('')
      setComposeSearch('')
      setShowCompose(false)
    }
  }

  // Render Compose Screen as a portal
  const renderComposeScreen = () => {
    if (!showCompose) return null

    return createPortal(
      <div className="compose-screen">
        <div className="compose-header">
          <button className="compose-back-btn" onClick={() => {
            setShowCompose(false)
            setSelectedRecipients([])
            setComposeSearch('')
            setComposeMessage('')
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2>New Message</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Selected Recipients */}
        {selectedRecipients.length > 0 && (
          <div className="compose-recipients">
            <span className="compose-to-label">To:</span>
            <div className="compose-recipients-list">
              {selectedRecipients.map(recipient => (
                <div key={recipient.username} className="compose-recipient-chip">
                  <img src={recipient.avatar} alt={recipient.username} />
                  <span>{recipient.username}</span>
                  <button onClick={() => toggleRecipient(recipient)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="compose-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search people or groups..."
            value={composeSearch}
            onChange={(e) => setComposeSearch(e.target.value)}
          />
        </div>

        {/* User List */}
        <div className="compose-user-list">
          {filteredUsers.map(user => {
            const isSelected = selectedRecipients.find(r => r.username === user.username)
            const partyColor = getPartyColor(user.party)
            return (
              <div
                key={user.username}
                className={`compose-user-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleRecipient(user)}
              >
                <div className="compose-user-avatar" style={{ borderColor: partyColor }}>
                  <img src={user.avatar} alt={user.username} />
                </div>
                <div className="compose-user-info">
                  <span className="compose-user-name">{user.username}</span>
                  <span className="compose-user-party">{user.party || 'Independent'}</span>
                </div>
                <div className={`compose-user-check ${isSelected ? 'checked' : ''}`}>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Message Input */}
        {selectedRecipients.length > 0 && (
          <div className="compose-message-area">
            <input
              type="text"
              placeholder="Write a message..."
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              className={`compose-send-btn ${composeMessage.trim() ? 'active' : ''}`}
              onClick={handleSendMessage}
              disabled={!composeMessage.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>,
      document.body
    )
  }

  // Render Live Photo Screen as a portal
  const renderLivePhotoScreen = () => {
    if (!showLivePhoto) return null

    return createPortal(
      <div className="live-photo-screen">
        <CreateScreen onClose={() => setShowLivePhoto(false)} />
      </div>,
      document.body
    )
  }

  // Render Long Press Popup as a portal
  const renderLongPressPopup = () => {
    if (!longPressPopup) return null

    const { message } = longPressPopup
    const isDM = !message.isPartyChat && !message.isGroupChat
    const isCurrentlyHidden = hiddenConversations.has(message.id) || message.isHidden
    const isCurrentlyPinned = pinnedConversations.has(message.id) || message.isPinned
    const isCurrentlySilenced = silencedConversations.has(message.id) || message.isMuted

    return createPortal(
      <>
        <div className="longpress-popup-overlay" onClick={closeLongPressPopup} />
        <div className="longpress-popup" onClick={(e) => e.stopPropagation()}>
          <div className="longpress-popup-options">
            {/* Mark Unread - DMs only */}
            {isDM && (
              <button className="longpress-popup-option" onClick={() => handleMarkUnread(message)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>Mark as unread</span>
              </button>
            )}

            {/* Pin */}
            <button className="longpress-popup-option" onClick={() => isCurrentlyPinned ? handleUnpinFromPopup(message) : handlePin(message)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isCurrentlyPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              <span>{isCurrentlyPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            {/* Silence */}
            <button className="longpress-popup-option" onClick={() => handleSilence(message)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isCurrentlySilenced ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                {isCurrentlySilenced ? (
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                ) : (
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
                )}
              </svg>
              <span>{isCurrentlySilenced ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Hide / Unhide */}
            <button className="longpress-popup-option" onClick={() => isCurrentlyHidden ? handleUnhide(message) : handleHide(message)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isCurrentlyHidden ? (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                )}
              </svg>
              <span>{isCurrentlyHidden ? 'Unhide' : 'Hide'}</span>
            </button>

            {/* Delete - at bottom */}
            <button className="longpress-popup-option danger" onClick={() => handleDeleteConversation(message)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </>,
      document.body
    )
  }

  return (
    <>
      {renderStoryViewer()}
      {renderActivityScreen()}
      {renderComposeScreen()}
      {renderLivePhotoScreen()}
      {renderLongPressPopup()}
    <div className={`messages-page ${longPressPopup ? 'popup-active' : ''}`}>
      {/* DEBUG BANNER - Remove after debugging */}
      <div style={{
        background: 'cyan',
        color: 'black',
        padding: '20px',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'relative',
        zIndex: 99999
      }}>
        MESSAGES LIST (Page 3) - No active conversation
      </div>

      {/* Header */}
      <div className="messages-header">
        <div className="messages-username">
          {currentUsername}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <button className="messages-compose-icon" onClick={() => setShowCompose(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            <path d="M12 8v4" />
            <path d="M10 10h4" />
          </svg>
        </button>
      </div>

      {/* Stories Section */}
      <div className="messages-stories-section">
        <div className="messages-section-header">
          <span className="messages-section-title">STORIES</span>
          <button className="messages-see-all">See all</button>
        </div>
        <div className="messages-stories-row">
          {/* Add story button */}
          <div
            className="messages-story-item"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowLivePhoto(true)
            }}
          >
            <div className="messages-story-add">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span className="messages-story-name">Add Story</span>
          </div>

          {/* User stories and other stories */}
          {storyUsers.map((story, index) => (
            <div
              key={story.id}
              className="messages-story-item"
              onClick={(e) => openStory(index, e)}
            >
              <div className={`messages-story-avatar ${story.hasUnread ? 'has-unread' : ''} ${story.isOwnStory ? 'own-story' : ''}`}>
                <img src={story.avatar} alt={story.username} />
              </div>
              <span className="messages-story-name">{story.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <div className="messages-activity-section">
        <div className="messages-section-header">
          <span className="messages-section-title">ACTIVITY</span>
          <button className="messages-see-all" onClick={(e) => { e.stopPropagation(); setShowActivity(true); }}>View all</button>
        </div>
        <div className="messages-activity-row">
          <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('likes'); setShowActivity(true); }}>
            <div className="activity-icon likes">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="activity-info">
              <span className="activity-count">{activity.likes || mockActivity.likes}</span>
              <span className="activity-label">New likes</span>
            </div>
          </div>
          <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('comments'); setShowActivity(true); }}>
            <div className="activity-icon comments">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="activity-info">
              <span className="activity-count">{activity.comments || mockActivity.comments}</span>
              <span className="activity-label">Comments</span>
            </div>
          </div>
          <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('reposts'); setShowActivity(true); }}>
            <div className="activity-icon reposts">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 17v-7h3l-4-4-4 4h3v9h10v-2H7zm10-10v7h-3l4 4 4-4h-3V5H9v2h8z"/>
              </svg>
            </div>
            <div className="activity-info">
              <span className="activity-count">{activity.reposts || mockActivity.reposts}</span>
              <span className="activity-label">Reposts</span>
            </div>
          </div>
          {isCandidate && (
            <>
              <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('reviews'); setShowActivity(true); }}>
                <div className="activity-icon reviews">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
                <div className="activity-info">
                  <span className="activity-count">{activity.reviews || mockActivity.reviews}</span>
                  <span className="activity-label">Reviews</span>
                </div>
              </div>
              <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('nominates'); setShowActivity(true); }}>
                <div className="activity-icon nominates">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="nominateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00F2EA" />
                        <stop offset="100%" stopColor="#FF2A55" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#nominateGradient)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="activity-info">
                  <span className="activity-count">{activity.nominates || mockActivity.nominates}</span>
                  <span className="activity-label">Nominates</span>
                </div>
              </div>
              <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('ballots'); setShowActivity(true); }}>
                <div className="activity-icon ballots">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1zm2-11H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <div className="activity-info">
                  <span className="activity-count">{activity.ballots || mockActivity.ballots}</span>
                  <span className="activity-label">Ballots</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="messages-filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`messages-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
            {filter.count !== null && <span className="filter-count">{filter.count}</span>}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="messages-list">
        {filteredMessages.length === 0 ? (
          <div className="messages-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>No messages yet</p>
            <span>Start a conversation with someone</span>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isPinned = pinnedConversations.has(message.id) || message.isPinned
            const isSilenced = silencedConversations.has(message.id) || message.isMuted
            const isHidden = hiddenConversations.has(message.id) || message.isHidden
            const isLongPressActive = longPressPopup?.message?.id === message.id
            return (
              <MessageItem
                key={message.id}
                message={message}
                isPinned={isPinned}
                isSilenced={isSilenced}
                isHidden={isHidden}
                isLongPressActive={isLongPressActive}
                onClick={() => handleOpenConversation(message)}
                onUnpin={(e) => handleUnpin(message, e)}
                onUnmute={(e) => handleUnmute(message, e)}
                onLongPress={handleLongPress}
              />
            )
          })
        )}
      </div>
    </div>
    </>
  )
}

function MessageItem({ message, isPinned, isSilenced, isHidden, isLongPressActive, onClick, onUnpin, onUnmute, onLongPress }) {
  const { user, lastMessage, timestamp, unreadCount, isOnline, hasUnread, isPartyChat, isGroupChat, party } = message
  const partyColor = getPartyColor(party || user?.party)

  // Display name: party name if converted to party, else user displayName, else username
  const displayName = party?.name || user?.displayName || user?.username
  const longPressTimer = useRef(null)
  const itemRef = useRef(null)

  const handleTouchStart = (e) => {
    longPressTimer.current = setTimeout(() => {
      const rect = itemRef.current?.getBoundingClientRect()
      onLongPress?.(message, rect)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMouseDown = (e) => {
    longPressTimer.current = setTimeout(() => {
      const rect = itemRef.current?.getBoundingClientRect()
      onLongPress?.(message, rect)
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div
      ref={itemRef}
      className={`message-item ${isPinned ? 'pinned' : ''} ${isSilenced ? 'silenced' : ''} ${isLongPressActive ? 'longpress-active' : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="message-avatar-container">
        <div
          className="message-avatar"
          style={{ borderColor: partyColor }}
        >
          {party?.avatarUrl || user?.avatar ? (
            <img src={party?.avatarUrl || user.avatar} alt={displayName} />
          ) : (
            <div className="message-avatar-placeholder">
              {isPartyChat || party ? '🎉' : (user?.username?.[0] || '?')}
            </div>
          )}
        </div>
      </div>

      <div className="message-content">
        <div className="message-username-row">
          <span className="message-username">{displayName}</span>
          {isOnline && !isPartyChat && !isGroupChat && <span className="message-online-dot" />}
        </div>
        <span className="message-preview">{lastMessage || 'No messages yet'}</span>
      </div>

      <div className="message-meta">
        <div className="message-meta-icons">
          {isSilenced && (
            <div className="message-muted-indicator" onClick={onUnmute} title="Click to unmute">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            </div>
          )}
          {isPinned && (
            <div className="message-pinned-indicator" onClick={onUnpin} title="Click to unpin">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            </div>
          )}
        </div>
        <span className="message-timestamp">{timestamp}</span>
        {unreadCount > 0 && (
          <span className="message-unread-badge">{unreadCount}</span>
        )}
      </div>
    </div>
  )
}

export default Messages
