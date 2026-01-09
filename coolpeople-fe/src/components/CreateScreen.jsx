import { useState, useRef } from 'react'
import AddSound from './AddSound'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import '../styling/CreateScreen.css'

function CreateScreen({ onClose }) {
  const [selectedDuration, setSelectedDuration] = useState('PHOTO')
  const [selectedMode, setSelectedMode] = useState('record') // 'record' or 'nominate'
  const [showAddSound, setShowAddSound] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showClipConfirm, setShowClipConfirm] = useState(false)
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const durations = ['10m', '60s', '15s', 'PHOTO']

  // Swipe handling for duration selector
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Recording handlers
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

  const handleCloseEditClipScreen = () => {
    setShowEditClipScreen(false)
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  const handleClosePostScreen = () => {
    setShowPostScreen(false)
  }

  const handlePost = (postData) => {
    console.log('Posting:', postData)
    setShowPostScreen(false)
    onClose()
  }

  const handleDeleteClip = () => {
    setShowClipConfirm(false)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    const currentIndex = durations.indexOf(selectedDuration)

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < durations.length - 1) {
        // Swipe left -> next option
        setSelectedDuration(durations[currentIndex + 1])
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right -> previous option
        setSelectedDuration(durations[currentIndex - 1])
      }
    }
  }

  return (
    <div className="create-screen">
      {/* Camera Preview (placeholder) */}
      <div className="create-camera-preview">
        <img
          src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop"
          alt="Camera preview"
          className="create-preview-image"
        />
      </div>

      {/* Top Controls */}
      <div className="create-top-controls">
        <button className="create-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="create-sound-btn" onClick={() => setShowAddSound(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{selectedSound ? selectedSound.name : 'add sound'}</span>
        </button>

        <div className="create-side-controls">
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className="create-bottom-controls"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Duration Selector */}
        {!isRecording && !showClipConfirm && (
          <div className="create-duration-selector">
            {durations.map((duration) => (
              <button
                key={duration}
                className={`create-duration-btn ${selectedDuration === duration ? 'active' : ''}`}
                onClick={() => setSelectedDuration(duration)}
              >
                {duration}
              </button>
            ))}
          </div>
        )}

        {/* Record Button Row */}
        <div className={`create-record-row ${showClipConfirm ? 'confirm-mode' : ''}`}>
          {/* Record Button */}
          {(selectedMode === 'record' || (!isRecording && !showClipConfirm)) && (
            <button
              className={`create-record-btn ${selectedMode === 'record' ? 'active' : ''} ${isRecording ? 'recording' : ''}`}
              onClick={() => !showClipConfirm && setSelectedMode('record')}
              onMouseDown={() => selectedMode === 'record' && !showClipConfirm && handleRecordStart()}
              onMouseUp={handleRecordEnd}
              onMouseLeave={handleRecordEnd}
              onTouchStart={() => selectedMode === 'record' && !showClipConfirm && handleRecordStart()}
              onTouchEnd={handleRecordEnd}
            >
              <div className="create-record-inner">
                <span className="create-record-c">C</span>
                <span className="create-record-p">P</span>
              </div>
            </button>
          )}

          {/* Nominate Button */}
          {(selectedMode === 'nominate' || (!isRecording && !showClipConfirm)) && (
            <button
              className={`create-nominate-btn ${selectedMode === 'nominate' ? 'active' : ''} ${isRecording ? 'recording' : ''}`}
              onClick={() => !showClipConfirm && setSelectedMode('nominate')}
              onMouseDown={() => selectedMode === 'nominate' && !showClipConfirm && handleRecordStart()}
              onMouseUp={handleRecordEnd}
              onMouseLeave={handleRecordEnd}
              onTouchStart={() => selectedMode === 'nominate' && !showClipConfirm && handleRecordStart()}
              onTouchEnd={handleRecordEnd}
            >
              <div className="create-nominate-inner">
                <span className="nominate-text">Nominate</span>
              </div>
            </button>
          )}

          {/* Clip Confirm Actions */}
          {showClipConfirm && (
            <div className="clip-inline-actions">
              <button className="clip-action-btn delete" onClick={handleDeleteClip}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <button className="clip-action-btn confirm" onClick={handleConfirmClip}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar with Gallery */}
      <div className="create-bottom-bar">
        <button className="create-gallery-btn">
          <img
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=100&h=100&fit=crop"
            alt="Gallery"
          />
        </button>
      </div>

      {/* Add Sound Screen */}
      {showAddSound && (
        <AddSound
          onClose={() => setShowAddSound(false)}
          onSelectSound={(sound) => setSelectedSound(sound)}
        />
      )}

      {/* Edit Clip Screen */}
      {showEditClipScreen && (
        <EditClipScreen
          onClose={handleCloseEditClipScreen}
          onNext={handleNextFromEditClip}
          selectedSound={selectedSound}
          onSelectSound={setSelectedSound}
        />
      )}

      {/* Post Screen */}
      {showPostScreen && (
        <PostScreen
          onClose={handleClosePostScreen}
          onPost={handlePost}
        />
      )}
    </div>
  )
}

export default CreateScreen
