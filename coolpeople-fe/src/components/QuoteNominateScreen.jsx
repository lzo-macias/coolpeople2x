import { useState } from 'react'
import { createPortal } from 'react-dom'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import '../styling/QuoteNominateScreen.css'

// Mock platform users
const mockPlatformUsers = [
  { id: 1, username: 'angelrivas', name: 'Angel Rivas', avatar: 'https://i.pravatar.cc/100?img=1', isOnPlatform: true },
  { id: 2, username: 'maya.creates', name: 'Maya Johnson', avatar: 'https://i.pravatar.cc/100?img=5', isOnPlatform: true },
  { id: 3, username: 'jordan_photo', name: 'Jordan Smith', avatar: 'https://i.pravatar.cc/100?img=8', isOnPlatform: true },
  { id: 4, username: 'alex.design', name: 'Alex Chen', avatar: 'https://i.pravatar.cc/100?img=11', isOnPlatform: true },
  { id: 5, username: 'sam_music', name: 'Sam Williams', avatar: 'https://i.pravatar.cc/100?img=15', isOnPlatform: true },
  { id: 6, username: 'taylor.art', name: 'Taylor Brown', avatar: 'https://i.pravatar.cc/100?img=20', isOnPlatform: true },
]

// Mock phone contacts
const mockContacts = [
  { id: 101, phone: '+1 (555) 123-4567', name: 'Mom', isOnPlatform: false },
  { id: 102, phone: '+1 (555) 234-5678', name: 'David Martinez', isOnPlatform: false },
  { id: 103, phone: '+1 (555) 345-6789', name: null, isOnPlatform: false }, // Unsaved contact
  { id: 104, phone: '+1 (555) 456-7890', name: 'Sarah K', isOnPlatform: false },
  { id: 105, phone: '+1 (555) 567-8901', name: null, isOnPlatform: false }, // Unsaved contact
  { id: 106, phone: '+1 (555) 678-9012', name: 'Work - John', isOnPlatform: false },
]

function QuoteNominateScreen({ reel, selectedRace, onClose, onComplete }) {
  const [isRecording, setIsRecording] = useState(false)
  const [showClipConfirm, setShowClipConfirm] = useState(false)
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)

  // Selfie cam state
  const [showSelfieCam, setShowSelfieCam] = useState(true)

  // Tag flow state
  const [showTagFlow, setShowTagFlow] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [tagSource, setTagSource] = useState('platform') // 'platform' or 'contacts'
  const [selectedTag, setSelectedTag] = useState(null)
  const [editingContactName, setEditingContactName] = useState(null)
  const [customContactNames, setCustomContactNames] = useState({})

  const handleRecordStart = () => {
    setIsRecording(true)
  }

  const handleRecordEnd = () => {
    if (isRecording) {
      setIsRecording(false)
      setShowClipConfirm(true)
    }
  }

  const handleConfirmClip = () => {
    setShowClipConfirm(false)
    setShowTagFlow(true) // Show tag flow instead of edit clip screen
  }

  const handleDeleteClip = () => {
    setShowClipConfirm(false)
  }

  const handleSelectTag = (user) => {
    setSelectedTag(user)
    setTagQuery('')
  }

  const handleConfirmTag = () => {
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleSkipTag = () => {
    setSelectedTag(null)
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  const handlePost = (postData) => {
    console.log('Quote Nomination Posted:', { ...postData, race: selectedRace, quotedUser: reel.user, taggedUser: selectedTag })
    setShowPostScreen(false)
    onComplete?.()
  }

  const handleSaveContactName = (contactId, newName) => {
    setCustomContactNames(prev => ({ ...prev, [contactId]: newName }))
    setEditingContactName(null)
  }

  // Filter users based on search query and source
  const getFilteredUsers = () => {
    const query = tagQuery.toLowerCase()
    if (tagSource === 'platform') {
      return mockPlatformUsers.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      )
    } else {
      return mockContacts.filter(contact => {
        const displayName = customContactNames[contact.id] || contact.name || contact.phone
        return displayName.toLowerCase().includes(query)
      })
    }
  }

  const filteredUsers = getFilteredUsers()

  // Get display name for contact
  const getContactDisplayName = (contact) => {
    return customContactNames[contact.id] || contact.name || contact.phone
  }

  return createPortal(
    <div className="quote-nominate-screen">
      {/* Clean Reel Preview (no UI elements) */}
      <div className="quote-reel-preview">
        <div
          className="quote-reel-media"
          style={{ backgroundImage: `url(${reel.thumbnail})` }}
        />
        <div className="quote-reel-overlay">
          {/* Quoted user info - minimal */}
          <div className="quote-reel-user">
            <img src={reel.user.avatar} alt={reel.user.username} className="quote-user-avatar" />
            <span className="quote-username">@{reel.user.username}</span>
          </div>
        </div>
      </div>

      {/* Front-facing Camera Frame - Top Left with X to remove */}
      {showSelfieCam && (
        <div className={`quote-camera-frame ${isRecording ? 'recording' : ''}`}>
          <button className="quote-camera-remove" onClick={() => setShowSelfieCam(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="quote-camera-preview">
            <img
              src="https://i.pravatar.cc/200?img=33"
              alt="Your camera"
              className="quote-camera-image"
            />
          </div>
          {isRecording && <div className="quote-camera-recording-indicator" />}
        </div>
      )}

      {/* Top Controls */}
      <div className="quote-top-controls">
        <button className="quote-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="quote-race-badge">
          <span>Nominating to {selectedRace?.name}</span>
        </div>
      </div>

      {/* Bottom Controls - Recording */}
      {!showTagFlow && (
        <div className="quote-bottom-controls">
          {/* Record Button Row */}
          <div className={`quote-record-row ${showClipConfirm ? 'confirm-mode' : ''}`}>
            {!showClipConfirm && (
              <button
                className={`quote-record-btn ${isRecording ? 'recording' : ''}`}
                onMouseDown={handleRecordStart}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchStart={handleRecordStart}
                onTouchEnd={handleRecordEnd}
              >
                <div className="quote-record-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
              </button>
            )}

            {/* Clip Confirm Actions */}
            {showClipConfirm && (
              <div className="quote-clip-actions">
                <button className="quote-clip-btn delete" onClick={handleDeleteClip}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <button className="quote-clip-btn confirm" onClick={handleConfirmClip}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <p className="quote-hint">Hold to record your nomination message</p>
        </div>
      )}

      {/* Tag Flow Overlay */}
      {showTagFlow && (
        <div className="tag-flow-overlay">
          {/* 50% opacity black line */}
          <div className="tag-divider-line" />

          {/* Selected Tag Display */}
          {selectedTag && (
            <div className="selected-tag-display">
              <span className="tag-at">@</span>
              <span className="tag-name">{selectedTag.username || getContactDisplayName(selectedTag)}</span>
            </div>
          )}

          {/* Tag Input */}
          <div className="tag-input-container">
            <span className="tag-input-at">@</span>
            <input
              type="text"
              className="tag-input"
              placeholder="search to tag someone"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Source Toggle */}
          <div className="tag-source-toggle">
            <button
              className={`tag-source-btn ${tagSource === 'platform' ? 'active' : ''}`}
              onClick={() => setTagSource('platform')}
            >
              On Platform
            </button>
            <button
              className={`tag-source-btn ${tagSource === 'contacts' ? 'active' : ''}`}
              onClick={() => setTagSource('contacts')}
            >
              Contacts
            </button>
          </div>

          {/* Users/Contacts Slider */}
          <div className="tag-users-slider">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className={`tag-user-item ${selectedTag?.id === user.id ? 'selected' : ''}`}
                onClick={() => handleSelectTag(user)}
              >
                {tagSource === 'platform' ? (
                  <>
                    <img src={user.avatar} alt={user.name} className="tag-user-avatar" />
                    <span className="tag-user-name">{user.name}</span>
                    <span className="tag-user-handle">@{user.username}</span>
                  </>
                ) : (
                  <>
                    <div className="tag-contact-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    {editingContactName === user.id ? (
                      <input
                        type="text"
                        className="tag-contact-name-input"
                        placeholder="Enter name"
                        defaultValue={customContactNames[user.id] || user.name || ''}
                        autoFocus
                        onBlur={(e) => handleSaveContactName(user.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveContactName(user.id, e.target.value)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="tag-user-name">{getContactDisplayName(user)}</span>
                        {!user.name && !customContactNames[user.id] && (
                          <button
                            className="tag-edit-name-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingContactName(user.id)
                            }}
                          >
                            Add name
                          </button>
                        )}
                        {!user.isOnPlatform && (
                          <span className="tag-invite-badge">Invite</span>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Tag Actions */}
          <div className="tag-flow-actions">
            <button className="tag-skip-btn" onClick={handleSkipTag}>
              Skip
            </button>
            <button
              className="tag-confirm-btn"
              onClick={handleConfirmTag}
              disabled={!selectedTag}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Edit Clip Screen */}
      {showEditClipScreen && (
        <EditClipScreen
          onClose={() => setShowEditClipScreen(false)}
          onNext={handleNextFromEditClip}
          selectedSound={selectedSound}
          onSelectSound={setSelectedSound}
        />
      )}

      {/* Post Screen */}
      {showPostScreen && (
        <PostScreen
          onClose={() => setShowPostScreen(false)}
          onPost={handlePost}
          isQuoteNomination={true}
          quotedUser={reel.user}
          selectedRace={selectedRace}
        />
      )}
    </div>,
    document.body
  )
}

export default QuoteNominateScreen
