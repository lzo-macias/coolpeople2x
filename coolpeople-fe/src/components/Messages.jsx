import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { mockMessages, getPartyColor } from '../data/mockData'
import Conversation from './Conversation'
import CreateScreen from './CreateScreen'
import '../styling/Messages.css'

// Mock stories data with content
const mockStories = [
  { id: 'add', isAdd: true },
  {
    id: 1,
    username: 'Pink Lady',
    avatar: 'https://i.pravatar.cc/150?img=1',
    hasUnread: true,
    party: 'The Pink Lady Party',
    stories: [
      { id: 's1', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=1000&fit=crop', timestamp: '2h ago' },
      { id: 's2', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&h=1000&fit=crop', timestamp: '4h ago' },
    ]
  },
  {
    id: 2,
    username: 'Lorem',
    avatar: 'https://i.pravatar.cc/150?img=2',
    hasUnread: true,
    party: 'Democrat',
    stories: [
      { id: 's3', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=1000&fit=crop', timestamp: '1h ago' },
    ]
  },
  {
    id: 3,
    username: 'Jake.M',
    avatar: 'https://i.pravatar.cc/150?img=3',
    hasUnread: false,
    party: 'Republican',
    stories: [
      { id: 's4', image: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=600&h=1000&fit=crop', timestamp: '6h ago' },
      { id: 's5', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=1000&fit=crop', timestamp: '8h ago' },
      { id: 's6', image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&h=1000&fit=crop', timestamp: '10h ago' },
    ]
  },
  {
    id: 4,
    username: 'Sarah',
    avatar: 'https://i.pravatar.cc/150?img=4',
    hasUnread: false,
    party: 'Independent',
    stories: [
      { id: 's7', image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=1000&fit=crop', timestamp: '3h ago' },
    ]
  },
  {
    id: 5,
    username: 'Marcus',
    avatar: 'https://i.pravatar.cc/150?img=5',
    hasUnread: false,
    party: 'The Pink Lady Party',
    stories: [
      { id: 's8', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=1000&fit=crop', timestamp: '5h ago' },
      { id: 's9', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=1000&fit=crop', timestamp: '7h ago' },
    ]
  },
]

// Mock activity data
const mockActivity = {
  likes: 24,
  comments: 8,
  reviews: 3,
}

// Detailed activity notifications
const mockActivityNotifications = {
  likes: [
    { id: 'l1', user: { username: 'Sara.playa', avatar: 'https://i.pravatar.cc/40?img=23', party: 'Democrat' }, content: 'liked your post', timestamp: '2m ago', postImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&h=100&fit=crop' },
    { id: 'l2', user: { username: 'Jake.M', avatar: 'https://i.pravatar.cc/40?img=3', party: 'Republican' }, content: 'liked your comment', timestamp: '15m ago' },
    { id: 'l3', user: { username: 'Pink Lady', avatar: 'https://i.pravatar.cc/40?img=1', party: 'The Pink Lady Party' }, content: 'liked your post', timestamp: '1h ago', postImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=100&h=100&fit=crop' },
    { id: 'l4', user: { username: 'Marcus', avatar: 'https://i.pravatar.cc/40?img=5', party: 'The Pink Lady Party' }, content: 'liked your story', timestamp: '2h ago' },
    { id: 'l5', user: { username: 'Lorem', avatar: 'https://i.pravatar.cc/40?img=2', party: 'Democrat' }, content: 'liked your post', timestamp: '3h ago', postImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop' },
  ],
  comments: [
    { id: 'c1', user: { username: 'Sara.playa', avatar: 'https://i.pravatar.cc/40?img=23', party: 'Democrat' }, content: 'commented: "This is amazing!"', timestamp: '5m ago', postImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&h=100&fit=crop' },
    { id: 'c2', user: { username: 'Jake.M', avatar: 'https://i.pravatar.cc/40?img=3', party: 'Republican' }, content: 'replied to your comment', timestamp: '30m ago' },
    { id: 'c3', user: { username: 'Sarah', avatar: 'https://i.pravatar.cc/40?img=4', party: 'Independent' }, content: 'commented: "Great work!"', timestamp: '2h ago', postImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=100&h=100&fit=crop' },
  ],
  reviews: [
    { id: 'r1', user: { username: 'Marcus', avatar: 'https://i.pravatar.cc/40?img=5', party: 'The Pink Lady Party' }, content: 'left you a 5-star review', timestamp: '1h ago', rating: 5 },
    { id: 'r2', user: { username: 'Pink Lady', avatar: 'https://i.pravatar.cc/40?img=1', party: 'The Pink Lady Party' }, content: 'left you a 4-star review', timestamp: '4h ago', rating: 4 },
    { id: 'r3', user: { username: 'Lorem', avatar: 'https://i.pravatar.cc/40?img=2', party: 'Democrat' }, content: 'left you a 5-star review', timestamp: '1d ago', rating: 5 },
  ],
}

function Messages({ onConversationChange, conversations, setConversations, userStories }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeConversation, setActiveConversation] = useState(null)
  const [viewingStory, setViewingStory] = useState(null) // { userIndex, storyIndex }
  const [showActivity, setShowActivity] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all') // 'all', 'likes', 'comments', 'reviews'
  const [showCompose, setShowCompose] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [composeMessage, setComposeMessage] = useState('')
  const [showLivePhoto, setShowLivePhoto] = useState(false)
  const storyTimerRef = useRef(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const touchStartX = useRef(0)
  const currentUsername = 'William.h.for.mayor'

  const unreadCount = mockMessages.filter(m => m.hasUnread).length
  const totalCount = mockMessages.length

  const filters = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'hidden', label: 'Hidden', count: null },
    { id: 'requests', label: 'Requests', count: null },
  ]

  const filteredMessages = mockMessages.filter((msg) => {
    if (activeFilter === 'unread') return msg.hasUnread
    if (activeFilter === 'party') return msg.user.party === 'The Pink Lady Party'
    return true
  })

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

    const allNotifications = [
      ...mockActivityNotifications.likes.map(n => ({ ...n, type: 'like' })),
      ...mockActivityNotifications.comments.map(n => ({ ...n, type: 'comment' })),
      ...mockActivityNotifications.reviews.map(n => ({ ...n, type: 'review' })),
    ].sort((a, b) => {
      const timeToMinutes = (t) => {
        if (t.includes('m ago')) return parseInt(t)
        if (t.includes('h ago')) return parseInt(t) * 60
        if (t.includes('d ago')) return parseInt(t) * 60 * 24
        return 0
      }
      return timeToMinutes(a.timestamp) - timeToMinutes(b.timestamp)
    })

    const filteredNotifications = activityFilter === 'all'
      ? allNotifications
      : activityFilter === 'likes'
        ? mockActivityNotifications.likes.map(n => ({ ...n, type: 'like' }))
        : activityFilter === 'comments'
          ? mockActivityNotifications.comments.map(n => ({ ...n, type: 'comment' }))
          : mockActivityNotifications.reviews.map(n => ({ ...n, type: 'review' }))

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
          {['all', 'likes', 'comments', 'reviews'].map(filter => (
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
          {filteredNotifications.map(notification => {
            const partyColor = getPartyColor(notification.user.party)
            return (
              <div key={notification.id} className="activity-notification-item">
                <div className="activity-notification-avatar" style={{ borderColor: partyColor }}>
                  <img src={notification.user.avatar} alt={notification.user.username} />
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
                    {notification.type === 'review' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="activity-notification-content">
                  <p>
                    <strong>{notification.user.username}</strong> {notification.content}
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
          })}
        </div>
      </div>,
      document.body
    )
  }

  // All users for compose search
  const allUsers = mockMessages.map(m => m.user)

  // Filter users based on search
  const filteredUsers = composeSearch.trim()
    ? allUsers.filter(user =>
        user.username.toLowerCase().includes(composeSearch.toLowerCase())
      )
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
  const handleSendMessage = () => {
    if (selectedRecipients.length > 0 && composeMessage.trim()) {
      // In a real app, this would send the message
      console.log('Sending to:', selectedRecipients, 'Message:', composeMessage)
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
                  <span className="compose-user-party">{user.party}</span>
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
              <span className="activity-count">{mockActivity.likes}</span>
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
              <span className="activity-count">{mockActivity.comments}</span>
              <span className="activity-label">Comments</span>
            </div>
          </div>
          <div className="messages-activity-card" onClick={(e) => { e.stopPropagation(); setActivityFilter('reviews'); setShowActivity(true); }}>
            <div className="activity-icon reviews">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
            <div className="activity-info">
              <span className="activity-count">{mockActivity.reviews}</span>
              <span className="activity-label">Reviews</span>
            </div>
          </div>
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
        {filteredMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onClick={() => handleOpenConversation(message)}
          />
        ))}
      </div>
    </div>
    </>
  )
}

function MessageItem({ message, onClick }) {
  const { user, lastMessage, timestamp, unreadCount, isOnline, hasUnread } = message
  const partyColor = getPartyColor(user.party)

  return (
    <div className="message-item" onClick={onClick}>
      <div className="message-avatar-container">
        <div
          className="message-avatar"
          style={{ borderColor: partyColor }}
        >
          <img src={user.avatar} alt={user.username} />
          <span className="message-avatar-label">{user.username.split('.')[0]}</span>
        </div>
      </div>

      <div className="message-content">
        <div className="message-username-row">
          <span className="message-username">{user.username}</span>
          {isOnline && <span className="message-online-dot" />}
        </div>
        <span className="message-preview">{lastMessage}</span>
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
