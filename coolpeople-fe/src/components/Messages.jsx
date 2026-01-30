import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { mockMessages, getPartyColor } from '../data/mockData'
import { messagesApi, storiesApi, notificationsApi, searchApi } from '../services/api'
import {
  initializeSocket,
  disconnectSocket,
  onNewMessage,
  onNewStory,
  onStoryExpired,
  onNewActivity,
  onNotification,
  onUserStatus,
  onPartyMessage,
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

function Messages({ onConversationChange, conversations, setConversations, userStories, isCandidate = false, userParty = null, currentUser = null }) {
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
  const currentUsername = currentUser?.username || 'User'

  // State for API data
  const [messages, setMessages] = useState([])
  const [stories, setStories] = useState([])
  const [notifications, setNotifications] = useState({ likes: [], comments: [], reposts: [], reviews: [], nominates: [], ballots: [] })
  const [activity, setActivity] = useState({ likes: 0, comments: 0, reposts: 0, reviews: 0, nominates: 0, ballots: 0 })
  const [searchResults, setSearchResults] = useState([])

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

  // Sort messages: party chat pinned first, then by most recent
  const sortMessages = (messagesList) => {
    return [...messagesList].sort((a, b) => {
      // Pin party chat at top if user is in a party
      if (userParty) {
        const aIsPartyChat = a.isPartyChat || a.partyId === userParty.id
        const bIsPartyChat = b.isPartyChat || b.partyId === userParty.id
        if (aIsPartyChat && !bIsPartyChat) return -1
        if (!aIsPartyChat && bIsPartyChat) return 1
      }
      // Then sort by most recent message
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0)
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0)
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
      // Update conversation list with new message
      setMessages(prev => {
        const existingIndex = prev.findIndex(m =>
          m.user?.id === data.senderId || m.id === data.conversationId
        )

        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: data.message.content,
            lastMessageAt: data.message.createdAt,
            timestamp: formatTimestamp(data.message.createdAt),
            hasUnread: data.senderId !== currentUser?.id,
            unreadCount: (updated[existingIndex].unreadCount || 0) + (data.senderId !== currentUser?.id ? 1 : 0),
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
            unreadCount: 1,
            hasUnread: true,
            isOnline: false,
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

    const cleanupNewActivity = onNewActivity((activity) => {
      // Map activity type to notification category
      const typeMap = {
        LIKE: 'likes',
        COMMENT: 'comments',
        REPOST: 'reposts',
        REVIEW: 'reviews',
        NOMINATE: 'nominates',
        BALLOT: 'ballots',
      }
      const category = typeMap[activity.type]

      if (category) {
        const notification = {
          id: `${activity.type}-${Date.now()}`,
          user: {
            username: activity.actorUsername,
            avatar: activity.actorAvatarUrl,
            party: null,
          },
          content: getActivityContent(activity.type),
          timestamp: formatTimestamp(activity.createdAt),
        }

        setNotifications(prev => ({
          ...prev,
          [category]: [notification, ...(prev[category] || [])],
        }))

        setActivity(prev => ({
          ...prev,
          [category]: (prev[category] || 0) + 1,
        }))
      }
    })

    const cleanupNotification = onNotification((notification) => {
      // Handle general notifications (already handled by onNewActivity for activity types)
      console.log('New notification:', notification)
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
          return sortMessages(prev.map(m => {
            if (m.partyId === partyId || m.isPartyChat) {
              return {
                ...m,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                timestamp: formatTimestamp(message.createdAt),
                hasUnread: message.senderId !== currentUser?.id,
                unreadCount: message.senderId !== currentUser?.id ? (m.unreadCount || 0) + 1 : m.unreadCount,
              }
            }
            return m
          }))
        }
        return prev
      })
    })

    // Cleanup on unmount
    return () => {
      cleanupNewMessage()
      cleanupNewStory()
      cleanupStoryExpired()
      cleanupNewActivity()
      cleanupNotification()
      cleanupUserStatus()
      cleanupPartyMessage()
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
      try {
        // Fetch conversations
        const conversationsRes = await messagesApi.getConversations()
        if (conversationsRes.data && conversationsRes.data.length > 0) {
          const transformedMessages = conversationsRes.data.map(conv => ({
            id: conv.id,
            partyId: conv.partyId,
            isPartyChat: conv.isPartyChat || false,
            user: {
              id: conv.otherUser?.id,
              username: conv.otherUser?.username || conv.otherUser?.displayName,
              avatar: conv.otherUser?.avatarUrl,
              party: conv.otherUser?.party || null,
            },
            lastMessage: conv.lastMessage?.text || '',
            lastMessageAt: conv.lastMessage?.createdAt,
            timestamp: formatTimestamp(conv.lastMessage?.createdAt),
            unreadCount: conv.unreadCount || 0,
            isOnline: conv.otherUser?.isOnline || false,
            hasUnread: conv.unreadCount > 0,
          }))
          setMessages(sortMessages(transformedMessages))
        }
      } catch (error) {
        console.log('Failed to fetch conversations:', error.message)
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
        if (notificationsRes.data) {
          const grouped = {
            likes: notificationsRes.data.filter(n => n.type === 'LIKE').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: 'liked your post',
              timestamp: formatTimestamp(n.createdAt),
              postImage: n.reel?.thumbnailUrl,
            })),
            comments: notificationsRes.data.filter(n => n.type === 'COMMENT').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: `commented: "${n.comment?.text || ''}"`,
              timestamp: formatTimestamp(n.createdAt),
              postImage: n.reel?.thumbnailUrl,
            })),
            reposts: notificationsRes.data.filter(n => n.type === 'REPOST').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: 'reposted your content',
              timestamp: formatTimestamp(n.createdAt),
              postImage: n.reel?.thumbnailUrl,
            })),
            reviews: notificationsRes.data.filter(n => n.type === 'REVIEW').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: `left you a ${n.review?.rating || 5}-star review`,
              timestamp: formatTimestamp(n.createdAt),
              rating: n.review?.rating,
            })),
            nominates: notificationsRes.data.filter(n => n.type === 'NOMINATE').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: 'nominated you',
              timestamp: formatTimestamp(n.createdAt),
              postImage: n.reel?.thumbnailUrl,
            })),
            ballots: notificationsRes.data.filter(n => n.type === 'BALLOT').map(n => ({
              id: n.id,
              user: { username: n.actor?.username, avatar: n.actor?.avatarUrl, party: n.actor?.party },
              content: 'added you to their ballot',
              timestamp: formatTimestamp(n.createdAt),
            })),
          }
          setNotifications(grouped)
          setActivity({
            likes: grouped.likes.length,
            comments: grouped.comments.length,
            reposts: grouped.reposts.length,
            reviews: grouped.reviews.length,
            nominates: grouped.nominates.length,
            ballots: grouped.ballots.length,
          })
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

  const unreadCount = messages.filter(m => m.hasUnread).length
  const totalCount = messages.length

  const filters = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'hidden', label: 'Hidden', count: null },
    { id: 'requests', label: 'Requests', count: null },
  ]

  // Filter and sort messages - party chat pinned at top, then by most recent
  const filteredMessages = sortMessages(messages.filter((msg) => {
    if (activeFilter === 'unread') return msg.hasUnread
    if (activeFilter === 'party') return msg.isPartyChat || msg.partyId === userParty?.id
    return true
  }))

  const handleOpenConversation = (message) => {
    setActiveConversation(message)
    onConversationChange?.(true)
  }

  const handleCloseConversation = () => {
    setActiveConversation(null)
    onConversationChange?.(false)
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

  // Show conversation view if one is selected
  if (activeConversation) {
    return (
      <Conversation
        conversation={activeConversation}
        onBack={handleCloseConversation}
        sharedConversations={conversations}
        setSharedConversations={setConversations}
      />
    )
  }

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
          <button className="activity-back-btn" onClick={() => setShowActivity(false)}>
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
              return (
                <div key={notification.id} className="activity-notification-item">
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
                      <strong>{notification.user?.username}</strong> {notification.content}
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
      try {
        // Send message to each recipient
        const sendPromises = selectedRecipients.map(recipient =>
          messagesApi.sendMessage({
            recipientId: recipient.id,
            text: composeMessage,
          })
        )
        await Promise.all(sendPromises)
        console.log('Messages sent successfully')
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

  return (
    <>
      {renderStoryViewer()}
      {renderActivityScreen()}
      {renderComposeScreen()}
      {renderLivePhotoScreen()}
    <div className="messages-page">
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
          filteredMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isPinned={message.isPartyChat || message.partyId === userParty?.id}
              onClick={() => handleOpenConversation(message)}
            />
          ))
        )}
      </div>
    </div>
    </>
  )
}

function MessageItem({ message, isPinned, onClick }) {
  const { user, lastMessage, timestamp, unreadCount, isOnline, hasUnread, isPartyChat } = message
  const partyColor = getPartyColor(user?.party)

  return (
    <div className={`message-item ${isPinned ? 'pinned' : ''}`} onClick={onClick}>
      {isPinned && (
        <div className="message-pinned-indicator">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </div>
      )}
      <div className="message-avatar-container">
        <div
          className="message-avatar"
          style={{ borderColor: partyColor }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user?.username} />
          ) : (
            <div className="message-avatar-placeholder">
              {isPartyChat ? '🎉' : (user?.username?.[0] || '?')}
            </div>
          )}
          <span className="message-avatar-label">{isPartyChat ? 'Party' : user?.username?.split('.')[0]}</span>
        </div>
      </div>

      <div className="message-content">
        <div className="message-username-row">
          <span className="message-username">{isPartyChat ? 'Party Chat' : user?.username}</span>
          {isOnline && <span className="message-online-dot" />}
        </div>
        <span className="message-preview">{lastMessage || 'No messages yet'}</span>
      </div>

      <div className="message-meta">
        <span className="message-timestamp">{timestamp}</span>
        {unreadCount > 0 && (
          <span className="message-unread-badge">{unreadCount}</span>
        )}
      </div>
    </div>
  )
}

export default Messages
