import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { mockConversations } from '../data/mockData'
import CreateScreen from './CreateScreen'
import PartySettings from './PartySettings'
import ChatSettings from './ChatSettings'
import '../styling/Conversation.css'

// Audio Message Component
function AudioMessage({ src, duration }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(progress)
      setCurrentTime(Math.floor(audioRef.current.currentTime))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-message">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <button className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <div className="audio-waveform">
        <div className="audio-progress" style={{ width: `${progress}%` }} />
        <div className="audio-bars">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="audio-bar"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>
      <span className="audio-duration">
        {formatTime(isPlaying ? currentTime : (duration || 0))}
      </span>
    </div>
  )
}

function Conversation({ conversation, onBack, sharedConversations, setSharedConversations }) {
  const [messageText, setMessageText] = useState('')
  const [showCreateScreen, setShowCreateScreen] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const [showPartySettings, setShowPartySettings] = useState(false)
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [messageReactions, setMessageReactions] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const { user } = conversation
  const isPartyChat = conversation.isParty || false
  // Use shared conversations if available, otherwise fall back to mock data
  const conversationMessages = sharedConversations?.[conversation.id] || mockConversations[conversation.id] || []
  const messages = [...conversationMessages, ...localMessages]

  // Current user avatar (would come from auth context in real app)
  const currentUserAvatar = 'https://i.pravatar.cc/40?img=12'

  const reactionEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍']

  const handleMessageClick = (msgId) => {
    setActiveMessageId(activeMessageId === msgId ? null : msgId)
  }

  const addReaction = (msgId, emoji) => {
    setMessageReactions(prev => {
      const current = prev[msgId] || []
      const existing = current.find(r => r.emoji === emoji)
      if (existing) {
        // Toggle off if already reacted with same emoji
        return {
          ...prev,
          [msgId]: current.filter(r => r.emoji !== emoji)
        }
      }
      return {
        ...prev,
        [msgId]: [...current, { emoji, count: 1 }]
      }
    })
    setActiveMessageId(null)
  }

  const handleReply = (msg) => {
    setReplyingTo(msg)
    setActiveMessageId(null)
  }

  const sendMessage = () => {
    if (!messageText.trim()) return
    const newMessage = {
      id: `local-${Date.now()}`,
      text: messageText,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, username: replyingTo.isOwn ? 'You' : user.username } : null
    }
    setLocalMessages(prev => [...prev, newMessage])

    // Also update shared conversations if available
    if (setSharedConversations) {
      setSharedConversations(prev => ({
        ...prev,
        [conversation.id]: [...(prev[conversation.id] || []), newMessage]
      }))
    }

    setMessageText('')
    setReplyingTo(null)
  }

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)

        // Send audio message
        const newMessage = {
          id: `local-${Date.now()}`,
          text: null,
          audioUrl: audioUrl,
          audioDuration: recordingTime,
          isOwn: true,
          timestamp: new Date().toISOString(),
          replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, username: replyingTo.isOwn ? 'You' : user.username } : null
        }
        setLocalMessages(prev => [...prev, newMessage])
        setReplyingTo(null)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      audioChunksRef.current = [] // Clear chunks so nothing is sent
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
      setRecordingTime(0)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

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
      <div className="conversation-messages" onClick={() => setActiveMessageId(null)}>
        {messages.map((msg) => {
          const reactions = messageReactions[msg.id] || []
          const isActive = activeMessageId === msg.id

          return (
            <div
              key={msg.id}
              className={`chat-message ${msg.isOwn ? 'own' : 'other'}`}
            >
              {!msg.isOwn && (
                <div className="chat-message-avatar">
                  <img src={user.avatar} alt={user.username} />
                </div>
              )}
              <div className="chat-bubble-wrapper">
                {/* Reply preview if this message is a reply */}
                {msg.replyTo && (
                  <div className="chat-reply-preview">
                    <span className="chat-reply-username">{msg.replyTo.username}</span>
                    <span className="chat-reply-text">{msg.replyTo.text?.substring(0, 50)}{msg.replyTo.text?.length > 50 ? '...' : ''}</span>
                  </div>
                )}

                {/* Reaction picker */}
                {isActive && (
                  <div className={`chat-reaction-picker ${msg.isOwn ? 'own' : 'other'}`} onClick={e => e.stopPropagation()}>
                    {reactionEmojis.map(emoji => (
                      <button
                        key={emoji}
                        className="chat-reaction-btn"
                        onClick={() => addReaction(msg.id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="chat-reaction-btn reply-btn"
                      onClick={() => handleReply(msg)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 14 4 9 9 4" />
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                      </svg>
                    </button>
                  </div>
                )}

                {msg.mediaUrl ? (
                  <div
                    className="chat-bubble media-bubble"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
                  >
                    <video
                      src={msg.mediaUrl}
                      className={`chat-media ${msg.isMirrored ? 'mirrored' : ''}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>
                ) : msg.audioUrl ? (
                  <div
                    className="chat-bubble audio-bubble"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
                  >
                    <AudioMessage src={msg.audioUrl} duration={msg.audioDuration} />
                  </div>
                ) : (
                  <div
                    className="chat-bubble"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Reactions display */}
                {reactions.length > 0 && (
                  <div className={`chat-reactions ${msg.isOwn ? 'own' : 'other'}`}>
                    {reactions.map(r => (
                      <span key={r.emoji} className="chat-reaction-item">{r.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
              {msg.isOwn && (
                <div className="chat-message-avatar">
                  <img src={currentUserAvatar} alt="You" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="conversation-reply-bar">
          <div className="conversation-reply-content">
            <span className="conversation-reply-label">Replying to {replyingTo.isOwn ? 'yourself' : user.username}</span>
            <span className="conversation-reply-text">{replyingTo.text?.substring(0, 50)}{replyingTo.text?.length > 50 ? '...' : ''}</span>
          </div>
          <button className="conversation-reply-close" onClick={() => setReplyingTo(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="conversation-input-area">
        <div className="conversation-input-wrapper">
          <input
            type="text"
            placeholder="message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="conversation-input"
          />
        </div>

        <button
          className={`conversation-action-btn ${isRecording ? 'recording' : ''}`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
        >
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

        {messageText.trim() && (
          <button className="conversation-send-btn" onClick={sendMessage}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Recording Overlay */}
      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-indicator">
            <div className="recording-pulse" />
            <span className="recording-time">{formatTime(recordingTime)}</span>
          </div>
          <p>Release to send, swipe left to cancel</p>
          <button className="recording-cancel-btn" onClick={cancelRecording}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {showCreateScreen && createPortal(
        <div className="create-studio-overlay">
          <CreateScreen
            onClose={() => setShowCreateScreen(false)}
            isConversationMode={true}
            conversationUser={user}
            onSendToConversation={(mediaUrl, isMirrored) => {
              // Add the sent clip as a message
              const newMessage = {
                id: `local-${Date.now()}`,
                text: null,
                mediaUrl: mediaUrl,
                mediaType: 'video',
                isMirrored: isMirrored,
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
        isPartyChat ? (
          <PartySettings
            party={{
              name: conversation.partyName,
              avatar: conversation.partyAvatar,
              color: conversation.partyColor || '#EC4899'
            }}
            isAdmin={true}
            onClose={() => setShowPartySettings(false)}
          />
        ) : (
          <ChatSettings
            chat={{
              name: user.username,
              username: user.username,
              avatar: user.avatar,
              color: '#3B82F6'
            }}
            isGroupChat={false}
            onClose={() => setShowPartySettings(false)}
          />
        ),
        document.body
      )}
    </div>
  )
}

export default Conversation
