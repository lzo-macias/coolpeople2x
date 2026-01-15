import { useState } from 'react'
import { createPortal } from 'react-dom'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import '../styling/QuoteNominateScreen.css'

function QuoteNominateScreen({ reel, selectedRace, onClose, onComplete }) {
  const [isRecording, setIsRecording] = useState(false)
  const [showClipConfirm, setShowClipConfirm] = useState(false)
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)

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
    setShowEditClipScreen(true)
  }

  const handleDeleteClip = () => {
    setShowClipConfirm(false)
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  const handlePost = (postData) => {
    console.log('Quote Nomination Posted:', { ...postData, race: selectedRace, quotedUser: reel.user })
    setShowPostScreen(false)
    onComplete?.()
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

      {/* Front-facing Camera Frame */}
      <div className={`quote-camera-frame ${isRecording ? 'recording' : ''}`}>
        <div className="quote-camera-preview">
          <img
            src="https://i.pravatar.cc/200?img=33"
            alt="Your camera"
            className="quote-camera-image"
          />
        </div>
        {isRecording && <div className="quote-camera-recording-indicator" />}
      </div>

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

      {/* Bottom Controls */}
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
