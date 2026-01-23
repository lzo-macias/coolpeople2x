import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import '../styling/QuoteNominateScreen.css'

function QuoteNominateScreen({ reel, selectedRace, onClose, onComplete }) {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [recordedVideoBase64, setRecordedVideoBase64] = useState(null) // For persistent storage
  const [isBase64Ready, setIsBase64Ready] = useState(false) // Track if base64 conversion is complete

  // Flow states - skip clip-inline-actions and tag-flow, go straight to edit
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)
  const [currentMode, setCurrentMode] = useState('nominate') // 'nominate', 'race', or 'party'
  const [raceName, setRaceName] = useState('')
  const [raceDeadline, setRaceDeadline] = useState(null)
  const [textOverlays, setTextOverlays] = useState([])

  // Camera refs
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // Main reel video ref
  const reelVideoRef = useRef(null)

  // Recorded selfie ref for playback
  const recordedSelfieRef = useRef(null)

  // Initialize selfie camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.log('Camera access denied or unavailable:', err)
      }
    }

    initCamera()

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Force play recorded selfie video when it's ready
  useEffect(() => {
    if (hasRecorded && recordedUrl && recordedSelfieRef.current) {
      const video = recordedSelfieRef.current
      video.load()
      video.play().catch(() => {})
    }
  }, [hasRecorded, recordedUrl])


  const handleRecordStart = () => {
    if (!streamRef.current) return

    setIsRecording(true)
    chunksRef.current = []

    const mediaRecorder = new MediaRecorder(streamRef.current)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setRecordedUrl(url)
      setHasRecorded(true)
      setIsBase64Ready(false) // Reset while converting

      // Convert blob to base64 for persistent storage in drafts
      const reader = new FileReader()
      reader.onloadend = () => {
        setRecordedVideoBase64(reader.result)
        setIsBase64Ready(true)
        console.log('Base64 conversion complete, length:', reader.result?.length)
      }
      reader.readAsDataURL(blob)
    }

    mediaRecorder.start()
  }

  const handleRecordEnd = () => {
    if (isRecording && mediaRecorderRef.current) {
      setIsRecording(false)
      mediaRecorderRef.current.stop()
    }
  }

  const handleDeleteClip = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl(null)
    setHasRecorded(false)
  }

  const handleConfirmClip = () => {
    setShowEditClipScreen(true)
  }

  const handleSaveDraft = () => {
    // TODO: Implement draft saving
    console.log('Saving draft...')
    handleDeleteClip()
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  const handlePost = (postData) => {
    console.log('Quote Nomination Posted:', {
      ...postData,
      race: selectedRace,
      quotedUser: reel.user,
      quotedReel: reel
    })
    setShowPostScreen(false)
    // Return to the reel we quoted
    onComplete?.()
  }

  // If showing EditClipScreen or PostScreen, render those instead
  if (showEditClipScreen) {
    console.log('QuoteNominateScreen -> EditClipScreen props:', {
      hasReel: !!reel,
      reelVideoUrl: reel?.videoUrl,
      reelThumbnail: reel?.thumbnail,
      recordedUrl: !!recordedUrl
    })
    return createPortal(
      <EditClipScreen
        onClose={() => {
          setShowEditClipScreen(false)
          setHasRecorded(false)
          setRecordedBlob(null)
          setRecordedUrl(null)
        }}
        onNext={handleNextFromEditClip}
        selectedSound={selectedSound}
        onSelectSound={setSelectedSound}
        recordedVideoUrl={recordedUrl}
        quotedReel={reel}
        isNominateMode={currentMode === 'nominate'}
        isRaceMode={currentMode === 'race'}
        taggedUser={reel.user}
        isMirrored={true}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        raceName={raceName}
        onRaceNameChange={setRaceName}
        raceDeadline={raceDeadline}
        onRaceDeadlineChange={setRaceDeadline}
        textOverlays={textOverlays}
        setTextOverlays={setTextOverlays}
        onCompleteToScoreboard={() => {
          setShowEditClipScreen(false)
          onComplete?.()
        }}
        onSaveDraft={() => {
          // Save draft to localStorage
          try {
            // Check if base64 is ready
            if (!isBase64Ready && !recordedVideoBase64) {
              console.warn('Base64 conversion not complete yet, using blob URL (will not persist)')
            }

            const existingDrafts = JSON.parse(localStorage.getItem('coolpeople-drafts') || '[]')
            // Use base64 data for persistent storage (blob URLs become invalid after session)
            // Explicitly save selfie video separately from quoted reel
            const selfieVideo = recordedVideoBase64 || recordedUrl

            // Validate we have proper data
            const isBase64 = selfieVideo?.startsWith('data:')
            console.log('Saving quote nomination draft:', {
              isBase64Ready,
              isBase64Video: isBase64,
              hasSelfie: !!selfieVideo,
              hasQuotedReel: !!reel,
              selfieLength: selfieVideo?.length,
              quotedReelVideo: !!reel?.videoUrl,
              quotedReelThumb: !!reel?.thumbnail
            })

            if (!isBase64) {
              console.error('WARNING: Saving blob URL instead of base64. Draft selfie will not persist!')
            }

            const newDraft = {
              id: `draft-${Date.now()}`,
              type: 'video',
              videoUrl: selfieVideo,
              selfieVideoUrl: selfieVideo, // Explicit field for selfie video
              thumbnail: reel.thumbnail,
              isMirrored: true,
              timestamp: Date.now(),
              mode: currentMode,
              raceName: raceName || null,
              raceDeadline: raceDeadline || null,
              taggedUser: reel.user || null,
              textOverlays: [...textOverlays],
              quotedReel: reel,
              isQuoteNomination: true,
              hasSelfieOverlay: true // Track that this draft has a selfie
            }
            localStorage.setItem('coolpeople-drafts', JSON.stringify([newDraft, ...existingDrafts]))
          } catch (e) {
            console.error('Failed to save draft:', e)
          }
          setShowEditClipScreen(false)
          // Don't call onComplete - just close and return to reel with nominate still available
          onClose?.()
        }}
      />,
      document.body
    )
  }

  if (showPostScreen) {
    return createPortal(
      <PostScreen
        onClose={() => {
          setShowPostScreen(false)
          setShowEditClipScreen(true)
        }}
        onPost={handlePost}
        isQuoteNomination={true}
        isNominateMode={currentMode === 'nominate'}
        isRaceMode={currentMode === 'race'}
        quotedUser={reel.user}
        selectedRace={selectedRace}
        quotedReel={reel}
        recordedVideoUrl={recordedUrl}
        isMirrored={true}
        taggedUser={reel.user}
        textOverlays={textOverlays}
        raceName={raceName}
        raceDeadline={raceDeadline}
      />,
      document.body
    )
  }

  return createPortal(
    <div className="quote-nominate-screen">
      {/* Main Reel Video Loop */}
      <div className="quote-reel-container">
        {reel.videoUrl ? (
          <video
            ref={reelVideoRef}
            src={reel.videoUrl}
            className="quote-reel-video"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div
            className="quote-reel-thumbnail"
            style={{ backgroundImage: `url(${reel.thumbnail})` }}
          />
        )}
      </div>

      {/* Selfie Camera - Mirrored */}
      <div className={`selfie-cam-container ${isRecording ? 'recording' : ''}`}>
        {hasRecorded && recordedUrl ? (
          <video
            key="recorded-selfie"
            ref={recordedSelfieRef}
            className="selfie-cam-video"
            src={recordedUrl}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={(e) => e.target.play()}
            onLoadedMetadata={(e) => e.target.play()}
          />
        ) : (
          <video
            key="live-selfie"
            ref={videoRef}
            className="selfie-cam-video"
            autoPlay
            muted
            playsInline
          />
        )}
        {isRecording && <div className="selfie-recording-dot" />}
      </div>

      {/* Close Button */}
      <button className="quote-close-btn" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Create Nominate Button with Inline Actions */}
      <div className={`quote-record-container ${hasRecorded ? 'confirm-mode' : ''}`}>
        <button
          className={`quote-record-btn active ${isRecording ? 'recording' : ''}`}
          onMouseDown={!hasRecorded ? handleRecordStart : undefined}
          onMouseUp={!hasRecorded ? handleRecordEnd : undefined}
          onMouseLeave={!hasRecorded ? handleRecordEnd : undefined}
          onTouchStart={!hasRecorded ? handleRecordStart : undefined}
          onTouchEnd={!hasRecorded ? handleRecordEnd : undefined}
        >
          <div className="quote-record-inner">
            <span className="nominate-text">Nominate</span>
          </div>
        </button>

        {/* Inline Actions - shown after recording */}
        {hasRecorded && (
          <div className="quote-inline-actions">
            <button className="quote-action-btn delete" onClick={handleDeleteClip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button className="quote-action-btn draft" onClick={handleSaveDraft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <button className="quote-action-btn confirm" onClick={handleConfirmClip}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          </div>
        )}

        {!hasRecorded && (
          <span className="quote-record-hint">
            {isRecording ? 'Recording...' : 'Hold to record'}
          </span>
        )}
      </div>

    </div>,
    document.body
  )
}

export default QuoteNominateScreen
