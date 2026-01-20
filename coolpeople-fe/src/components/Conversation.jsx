import { useState } from 'react'
import { createPortal } from 'react-dom'
import { mockConversations } from '../data/mockData'
import CreateScreen from './CreateScreen'
import PartySettings from './PartySettings'
import '../styling/Conversation.css'

function Conversation({ conversation, onBack }) {
  const [messageText, setMessageText] = useState('')
  const [showCreateScreen, setShowCreateScreen] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const [showPartySettings, setShowPartySettings] = useState(false)
  const { user } = conversation
  const isPartyChat = conversation.isParty || false
  const mockMessages = mockConversations[conversation.id] || []
  const messages = [...mockMessages, ...localMessages]

  // Current user avatar (would come from auth context in real app)
  const currentUserAvatar = 'https://i.pravatar.cc/40?img=12'

  return (
    <div className="conversation-page">
      {/* Header */}
      <div className="conversation-header">
        <button className="conversation-back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="conversation-user-info">
          <div className="conversation-avatar">
            <img src={user.avatar} alt={user.username} />
          </div>
          <span className="conversation-username">{user.username}</span>
        </div>

        <button className="conversation-menu-btn" onClick={() => setShowPartySettings(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.isOwn ? 'own' : 'other'}`}
          >
            {!msg.isOwn && (
              <div className="chat-message-avatar">
                <img src={user.avatar} alt={user.username} />
              </div>
            )}
            {msg.mediaUrl ? (
              <div className="chat-bubble media-bubble">
                <video
                  src={msg.mediaUrl}
                  className="chat-media"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            ) : (
              <div className="chat-bubble">
                {msg.text}
              </div>
            )}
            {msg.isOwn && (
              <div className="chat-message-avatar">
                <img src={currentUserAvatar} alt="You" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="conversation-input-area">
        <div className="conversation-input-wrapper">
          <input
            type="text"
            placeholder="message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="conversation-input"
          />
        </div>

        <button className="conversation-action-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <button className="conversation-action-btn" onClick={() => setShowCreateScreen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
      </div>

      {showCreateScreen && createPortal(
        <div className="create-studio-overlay">
          <CreateScreen
            onClose={() => setShowCreateScreen(false)}
            isConversationMode={true}
            conversationUser={user}
            onSendToConversation={(mediaUrl) => {
              // Add the sent clip as a message
              const newMessage = {
                id: `local-${Date.now()}`,
                text: null,
                mediaUrl: mediaUrl,
                mediaType: 'video',
                isOwn: true,
                timestamp: new Date().toISOString()
              }
              setLocalMessages(prev => [...prev, newMessage])
              setShowCreateScreen(false)
            }}
          />
        </div>,
        document.body
      )}

      {showPartySettings && createPortal(
        <PartySettings
          party={{
            name: isPartyChat ? conversation.partyName : user.username,
            avatar: isPartyChat ? conversation.partyAvatar : user.avatar,
            color: conversation.partyColor || '#EC4899'
          }}
          isAdmin={true}
          onClose={() => setShowPartySettings(false)}
        />,
        document.body
      )}
    </div>
  )
}

export default Conversation
