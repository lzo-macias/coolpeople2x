import { useState } from 'react'
import { mockMessages, getPartyColor } from '../data/mockData'
import Conversation from './Conversation'
import '../styling/Messages.css'

// Mock stories data
const mockStories = [
  { id: 'add', isAdd: true },
  { id: 1, username: 'Pink Lady', avatar: 'https://i.pravatar.cc/150?img=1', hasUnread: true },
  { id: 2, username: 'Lorem', avatar: 'https://i.pravatar.cc/150?img=2', hasUnread: true },
  { id: 3, username: 'Jake.M', avatar: 'https://i.pravatar.cc/150?img=3', hasUnread: false },
  { id: 4, username: 'Sarah', avatar: 'https://i.pravatar.cc/150?img=4', hasUnread: false },
  { id: 5, username: 'Marcus', avatar: 'https://i.pravatar.cc/150?img=5', hasUnread: false },
]

// Mock activity data
const mockActivity = {
  likes: 24,
  comments: 8,
  reviews: 3,
}

function Messages({ onConversationChange }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeConversation, setActiveConversation] = useState(null)
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

  // Show conversation view if one is selected
  if (activeConversation) {
    return (
      <Conversation
        conversation={activeConversation}
        onBack={handleCloseConversation}
      />
    )
  }

  return (
    <div className="messages-page">
      {/* Header */}
      <div className="messages-header">
        <div className="messages-username">
          {currentUsername}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Stories Section */}
      <div className="messages-stories-section">
        <div className="messages-section-header">
          <span className="messages-section-title">STORIES</span>
          <button className="messages-see-all">See all</button>
        </div>
        <div className="messages-stories-row">
          {mockStories.map((story) => (
            <div key={story.id} className="messages-story-item">
              {story.isAdd ? (
                <div className="messages-story-add">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              ) : (
                <div className={`messages-story-avatar ${story.hasUnread ? 'has-unread' : ''}`}>
                  <img src={story.avatar} alt={story.username} />
                </div>
              )}
              <span className="messages-story-name">{story.isAdd ? 'Add Story' : story.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Section */}
      <div className="messages-activity-section">
        <div className="messages-section-header">
          <span className="messages-section-title">ACTIVITY</span>
          <button className="messages-see-all">View all</button>
        </div>
        <div className="messages-activity-row">
          <div className="messages-activity-card">
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
          <div className="messages-activity-card">
            <div className="activity-icon comments">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="activity-info">
              <span className="activity-count">{mockActivity.comments}</span>
              <span className="activity-label">Comments</span>
            </div>
          </div>
          <div className="messages-activity-card">
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
        {isOnline && <div className="message-online-indicator" />}
      </div>

      <div className="message-content">
        <div className="message-username-row">
          <span className="message-username">{user.username}</span>
          {hasUnread && <span className="message-unread-dot" />}
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
