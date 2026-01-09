import { useState } from 'react'
import { mockMessages, getPartyColor } from '../data/mockData'
import Conversation from './Conversation'
import '../styling/Messages.css'

function Messages({ onConversationChange }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeConversation, setActiveConversation] = useState(null)
  const currentUsername = 'William.h.for.mayor'

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'hidden', label: 'Hidden' },
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

      {/* Search Bar */}
      <div className="messages-search-row">
        <div className="messages-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Search messages</span>
        </div>
        <button className="messages-compose-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
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
