import { useState, useRef, useEffect } from 'react'
import AddSound from './AddSound'
import '../styling/EditClipScreen.css'

function EditClipScreen({ onClose, onNext, selectedSound, onSelectSound, isRaceMode, raceName, onRaceNameChange, recordedVideoUrl, isMirrored, isConversationMode, conversationUser, onSend }) {
  const [showAddSound, setShowAddSound] = useState(false)
  const [isEditingRace, setIsEditingRace] = useState(false)
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [sendMode, setSendMode] = useState('separate') // 'separate' or 'together'

  // Initialize selected recipients with conversation user when panel opens
  const initializePanel = () => {
    if (conversationUser && !selectedRecipients.find(u => u.id === conversationUser.id)) {
      setSelectedRecipients([conversationUser])
    }
    setShowUserPanel(true)
  }

  // Mock users for the selection panel - conversation user first if exists
  const otherUsers = [
    { id: 1, username: 'maya_creates', avatar: 'https://i.pravatar.cc/40?img=1' },
    { id: 2, username: 'alex.design', avatar: 'https://i.pravatar.cc/40?img=2' },
    { id: 3, username: 'jordan_photo', avatar: 'https://i.pravatar.cc/40?img=4' },
    { id: 4, username: 'sam_music', avatar: 'https://i.pravatar.cc/40?img=5' },
    { id: 5, username: 'taylor.art', avatar: 'https://i.pravatar.cc/40?img=6' },
    { id: 6, username: 'chris_dev', avatar: 'https://i.pravatar.cc/40?img=7' },
  ]

  // Put conversation user first in the list
  const availableUsers = conversationUser
    ? [conversationUser, ...otherUsers.filter(u => u.id !== conversationUser.id)]
    : otherUsers

  const toggleRecipient = (user) => {
    setSelectedRecipients(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    )
  }

  const isSelected = (user) => selectedRecipients.find(u => u.id === user.id)

  const handleSend = () => {
    if (selectedRecipients.length === 0 && conversationUser) {
      // If no one selected but we have conversation user, send to them
      onSend?.([conversationUser])
    } else {
      onSend?.(selectedRecipients)
    }
  }
  const [pillPosition, setPillPosition] = useState({ x: 20, y: null }) // y: null means use default bottom position
  const [isDragging, setIsDragging] = useState(false)
  const raceInputRef = useRef(null)
  const pillRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0, pillX: 0, pillY: 0 })

  // Auto-focus input when editing
  useEffect(() => {
    if (isEditingRace && raceInputRef.current) {
      raceInputRef.current.focus()
    }
  }, [isEditingRace])

  // Drag handlers
  const handleDragStart = (clientX, clientY) => {
    if (isEditingRace) return
    const pill = pillRef.current
    if (!pill) return

    const rect = pill.getBoundingClientRect()
    const parentRect = pill.parentElement.getBoundingClientRect()

    setIsDragging(true)
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      pillX: rect.left - parentRect.left,
      pillY: rect.top - parentRect.top
    }
  }

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return

    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y

    setPillPosition({
      x: dragStartRef.current.pillX + deltaX,
      y: dragStartRef.current.pillY + deltaY
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  // Touch events
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e) => {
    const touch = e.touches[0]
    handleDragMove(touch.clientX, touch.clientY)
  }

  // Global mouse move/up listeners
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => handleDragEnd()

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const canProceed = !isRaceMode || raceName.trim().length > 0

  return (
    <div className="edit-clip-screen">
      {/* Video Preview */}
      <div className="edit-clip-preview">
        {recordedVideoUrl ? (
          <video
            src={recordedVideoUrl}
            className={`edit-clip-video ${isMirrored ? 'mirrored' : ''}`}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop"
            alt="Clip preview"
          />
        )}
      </div>

      {/* Top Controls */}
      <div className="edit-clip-top">
        <button className="edit-clip-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="edit-clip-sound-btn" onClick={() => setShowAddSound(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{selectedSound ? selectedSound.name : 'add sound'}</span>
        </button>

        <div className="edit-clip-side-controls">
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>
        </div>
      </div>

      {/* Race Name Pill - only shown in race mode */}
      {isRaceMode && (
        <div
          ref={pillRef}
          className={`edit-clip-race-pill-wrapper ${isDragging ? 'dragging' : ''}`}
          style={pillPosition.y !== null ? {
            left: pillPosition.x,
            top: pillPosition.y,
            bottom: 'auto'
          } : {
            left: pillPosition.x
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          {isEditingRace ? (
            <div className="race-pill-edit-container" onClick={(e) => e.stopPropagation()}>
              <span className="race-pill-dot"></span>
              <input
                ref={raceInputRef}
                type="text"
                className="race-pill-input"
                placeholder="Name your race..."
                value={raceName}
                onChange={(e) => onRaceNameChange(e.target.value)}
                onBlur={() => setIsEditingRace(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingRace(false)}
                maxLength={40}
              />
            </div>
          ) : (
            <button
              className={`race-pill-display ${!raceName ? 'empty' : ''}`}
              onClick={() => !isDragging && setIsEditingRace(true)}
            >
              <span className="race-pill-dot"></span>
              <span className="race-pill-text">
                {raceName || 'Tap to name race'}
              </span>
              <svg className="race-pill-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Bottom */}
      <div className="edit-clip-bottom">
        {isConversationMode ? (
          <>
            <button
              className="edit-clip-add-btn"
              onClick={initializePanel}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className="edit-clip-send-btn" onClick={handleSend}>
              send
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button className={`edit-clip-story-btn ${!canProceed ? 'disabled' : ''}`} disabled={!canProceed}>
              <img
                src="https://i.pravatar.cc/40?img=3"
                alt="Profile"
                className="edit-clip-story-avatar"
              />
              <span>your story</span>
            </button>
            <button className={`edit-clip-next-btn ${!canProceed ? 'disabled' : ''}`} onClick={onNext} disabled={!canProceed}>
              next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Add Sound Screen */}
      {showAddSound && (
        <AddSound
          onClose={() => setShowAddSound(false)}
          onSelectSound={(sound) => {
            onSelectSound?.(sound)
            setShowAddSound(false)
          }}
        />
      )}

      {/* User Selection Panel (Conversation Mode) */}
      {showUserPanel && (
        <div className="user-panel-overlay" onClick={() => setShowUserPanel(false)}>
          <div className="user-panel" onClick={(e) => e.stopPropagation()}>
            <div className="user-panel-header">
              <div className="user-panel-header-left">
                <h3>Send to</h3>
                {selectedRecipients.length > 1 && (
                  <button
                    className={`send-mode-mini-btn ${sendMode === 'together' ? 'active' : ''}`}
                    onClick={() => setSendMode(sendMode === 'separate' ? 'together' : 'separate')}
                  >
                    {sendMode === 'separate' ? 'Separate' : 'Together'}
                  </button>
                )}
              </div>
              <button className="user-panel-close" onClick={() => setShowUserPanel(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selected recipients chips */}
            {selectedRecipients.length > 0 && (
              <div className="user-panel-selected">
                {selectedRecipients.map(user => (
                  <div key={user.id} className="user-panel-chip">
                    <img src={user.avatar} alt={user.username} />
                    <span>{user.username}</span>
                    <button onClick={() => toggleRecipient(user)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="user-panel-list">
              {availableUsers.map(user => (
                <div
                  key={user.id}
                  className={`user-panel-item ${isSelected(user) ? 'selected' : ''}`}
                  onClick={() => toggleRecipient(user)}
                >
                  <img src={user.avatar} alt={user.username} />
                  <span>{user.username}</span>
                  <div className={`user-panel-check ${isSelected(user) ? 'checked' : ''}`}>
                    {isSelected(user) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="user-panel-done" onClick={handleSend}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditClipScreen
