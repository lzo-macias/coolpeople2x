import { useState, useRef, useEffect } from 'react'
import AddSound from './AddSound'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import PartyCreationFlow from './PartyCreationFlow'
import '../styling/CreateScreen.css'

function CreateScreen({ onClose, isConversationMode, conversationUser, onSendToConversation, onPartyCreated }) {
  const [selectedDuration, setSelectedDuration] = useState('PHOTO')
  const [selectedMode, setSelectedMode] = useState('record') // 'record', 'nominate', 'race', or 'party'
  const [showAddSound, setShowAddSound] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showClipConfirm, setShowClipConfirm] = useState(false)
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [showPartyCreationFlow, setShowPartyCreationFlow] = useState(false)
  const [raceName, setRaceName] = useState('')
  const [facingMode, setFacingMode] = useState('user') // 'user' = front, 'environment' = back
  const [cameraError, setCameraError] = useState(null)
  const durations = ['10m', '60s', '15s', 'PHOTO']

  // Refs
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [recordedWithFrontCamera, setRecordedWithFrontCamera] = useState(false)

  // Swipe handling for duration selector
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Camera initialization
  const startCamera = async (facing = facingMode) => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Attach to video element - might need to wait for ref to be ready
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        } else {
          // Retry if ref isn't ready yet
          setTimeout(attachStream, 50)
        }
      }
      attachStream()

      setCameraError(null)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Unable to access camera')
    }
  }

  // Flip camera
  const flipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    startCamera(newFacing)
  }

  // Start camera on mount
  useEffect(() => {
    startCamera()

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Re-attach stream to video element when switching back to live mode
  useEffect(() => {
    const isShowingLive = !showClipConfirm || !recordedVideoUrl
    if (isShowingLive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showClipConfirm, recordedVideoUrl])

  // Recording handlers
  const handleRecordStart = () => {
    if (!streamRef.current) return

    setIsRecording(true)
    recordedChunksRef.current = []
    setRecordedWithFrontCamera(facingMode === 'user')

    // Determine supported mime type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          console.warn('No recorded data captured')
          setShowClipConfirm(true)
          return
        }
        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        console.log('Recorded blob size:', blob.size)
        const url = URL.createObjectURL(blob)
        setRecordedVideoUrl(url)
        setShowClipConfirm(true)
      }

      mediaRecorder.start(100) // Collect data every 100ms
    } catch (err) {
      console.error('MediaRecorder error:', err)
      setIsRecording(false)
    }
  }

  const handleRecordEnd = () => {
    if (isRecording && mediaRecorderRef.current) {
      setIsRecording(false)
      mediaRecorderRef.current.stop()
    }
  }

  const handleConfirmClip = () => {
    setShowClipConfirm(false)
    if (selectedMode === 'party') {
      setShowPartyCreationFlow(true)
    } else {
      setShowEditClipScreen(true)
    }
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

  const handleClosePartyCreationFlow = () => {
    setShowPartyCreationFlow(false)
  }

  const handlePartyCreated = (partyData) => {
    console.log('Party created:', partyData)
    setShowPartyCreationFlow(false)
    onPartyCreated?.(partyData)
  }

  const handleDeleteClip = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setShowClipConfirm(false)

    // Re-attach camera stream after a brief delay to ensure video element is ready
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
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
      {/* Camera Preview */}
      <div className="create-camera-preview">
        {showClipConfirm && recordedVideoUrl ? (
          <video
            key="recorded"
            src={recordedVideoUrl}
            className={`create-preview-video ${recordedWithFrontCamera ? 'mirrored' : ''}`}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => console.log('Recorded video loaded successfully')}
            onError={(e) => console.error('Recorded video error:', e)}
          />
        ) : (
          <video
            key="live"
            ref={videoRef}
            className={`create-preview-video ${facingMode === 'user' ? 'mirrored' : ''}`}
            autoPlay
            muted
            playsInline
          />
        )}
        {cameraError && (
          <div className="create-camera-error">
            <span>{cameraError}</span>
            <button onClick={() => startCamera()}>Retry</button>
          </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="create-top-controls">
        <button className="create-close-btn" onClick={showClipConfirm ? handleDeleteClip : onClose}>
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
          <button className="create-side-btn flip-camera" onClick={flipCamera}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-3a2 2 0 00-2 2v6a2 2 0 002 2h3a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path d="M14 7H4a2 2 0 00-2 2v6a2 2 0 002 2h10" />
              <path d="M7 7V4l3 3-3 3V7z" />
              <path d="M17 17v3l-3-3 3-3v3z" />
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
        <div className={`create-record-row ${showClipConfirm ? 'confirm-mode' : ''} mode-${selectedMode}`}>
          {/* Buttons always in fixed order, CSS handles centering active one */}
          {/* Distance from active: 2+ slots away = "far" class for smaller size */}
          {!(isRecording || showClipConfirm) ? (
            <div className="create-buttons-track">
              <button
                className={`create-nominate-btn ${selectedMode === 'nominate' ? 'active' : ''} ${(selectedMode === 'race' || selectedMode === 'party') ? 'far' : ''}`}
                onClick={() => setSelectedMode('nominate')}
                onMouseDown={() => selectedMode === 'nominate' && handleRecordStart()}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchStart={() => selectedMode === 'nominate' && handleRecordStart()}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-nominate-inner">
                  <span className="nominate-text">Nominate</span>
                </div>
              </button>

              <button
                className={`create-record-btn ${selectedMode === 'record' ? 'active' : ''} ${selectedMode === 'party' ? 'far' : ''}`}
                onClick={() => setSelectedMode('record')}
                onMouseDown={() => selectedMode === 'record' && handleRecordStart()}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchStart={() => selectedMode === 'record' && handleRecordStart()}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-record-inner">
                  <span className="create-record-c">C</span>
                  <span className="create-record-p">P</span>
                </div>
              </button>

              <button
                className={`create-race-btn ${selectedMode === 'race' ? 'active' : ''} ${selectedMode === 'nominate' ? 'far' : ''}`}
                onClick={() => setSelectedMode('race')}
                onMouseDown={() => selectedMode === 'race' && handleRecordStart()}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchStart={() => selectedMode === 'race' && handleRecordStart()}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-race-inner">
                  <span className="race-text">Race</span>
                </div>
              </button>

              <button
                className={`create-party-btn ${selectedMode === 'party' ? 'active' : ''} ${(selectedMode === 'nominate' || selectedMode === 'record') ? 'far' : ''}`}
                onClick={() => setSelectedMode('party')}
                onMouseDown={() => selectedMode === 'party' && handleRecordStart()}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchStart={() => selectedMode === 'party' && handleRecordStart()}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-party-inner">
                  <span className="party-text">Party</span>
                </div>
              </button>
            </div>
          ) : (
            /* Only show active button when recording or confirming - needs release handlers */
            selectedMode === 'record' ? (
              <button
                className={`create-record-btn active ${isRecording ? 'recording' : ''}`}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-record-inner">
                  <span className="create-record-c">C</span>
                  <span className="create-record-p">P</span>
                </div>
              </button>
            ) : selectedMode === 'nominate' ? (
              <button
                className={`create-nominate-btn active ${isRecording ? 'recording' : ''}`}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-nominate-inner">
                  <span className="nominate-text">Nominate</span>
                </div>
              </button>
            ) : selectedMode === 'race' ? (
              <button
                className={`create-race-btn active ${isRecording ? 'recording' : ''}`}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-race-inner">
                  <span className="race-text">Race</span>
                </div>
              </button>
            ) : (
              <button
                className={`create-party-btn active ${isRecording ? 'recording' : ''}`}
                onMouseUp={handleRecordEnd}
                onMouseLeave={handleRecordEnd}
                onTouchEnd={handleRecordEnd}
              >
                <div className="create-party-inner">
                  <span className="party-text">Party</span>
                </div>
              </button>
            )
          )}

          {/* Clip Confirm Actions */}
          {showClipConfirm && (
            <div className="clip-inline-actions">
              <button className="clip-action-btn delete" onClick={handleDeleteClip}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <button className="clip-action-btn draft" onClick={() => {
                console.log('Saving draft:', recordedVideoUrl)
                // In a real app, save to drafts storage
                handleDeleteClip()
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
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
          isRaceMode={selectedMode === 'race'}
          raceName={raceName}
          onRaceNameChange={setRaceName}
          recordedVideoUrl={recordedVideoUrl}
          isMirrored={recordedWithFrontCamera}
          isConversationMode={isConversationMode}
          conversationUser={conversationUser}
          onSend={(recipients) => {
            console.log('Sending to:', recipients)
            onSendToConversation?.(recordedVideoUrl)
          }}
        />
      )}

      {/* Post Screen */}
      {showPostScreen && (
        <PostScreen
          onClose={handleClosePostScreen}
          onPost={handlePost}
          isRaceMode={selectedMode === 'race'}
          raceName={raceName}
          recordedVideoUrl={recordedVideoUrl}
          isMirrored={recordedWithFrontCamera}
        />
      )}

      {/* Party Creation Flow */}
      {showPartyCreationFlow && (
        <PartyCreationFlow
          onClose={handleClosePartyCreationFlow}
          onComplete={handlePartyCreated}
          recordedVideoUrl={recordedVideoUrl}
          isMirrored={recordedWithFrontCamera}
        />
      )}

    </div>
  )
}

export default CreateScreen
