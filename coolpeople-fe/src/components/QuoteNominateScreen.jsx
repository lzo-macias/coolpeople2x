import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import { saveDraftBlob } from '../utils/draftBlobStore'
import { reelsApi } from '../services/api'
import '../styling/QuoteNominateScreen.css'

function QuoteNominateScreen({ reel, selectedRace, onClose, onComplete, isQuoteMode = false, onPostCreated, conversations = {}, userParty, currentUser, userRacesFollowing = [], userRacesCompeting = [] }) {
  const [isPosting, setIsPosting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)

  // Flow states - skip clip-inline-actions and tag-flow, go straight to edit
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)
  const [currentMode, setCurrentMode] = useState(isQuoteMode ? 'quote' : 'nominate') // 'nominate', 'race', 'party', or 'quote'
  const [raceName, setRaceName] = useState('')
  const [raceDeadline, setRaceDeadline] = useState(null)
  const [textOverlays, setTextOverlays] = useState([])

  // Selfie overlay state (same as CreateScreen — passed to EditClipScreen)
  const [selfieSize, setSelfieSize] = useState({ w: 120, h: 160 })
  const [selfiePosition, setSelfiePosition] = useState({ x: 16, y: 80 })
  const [showSelfieOverlay, setShowSelfieOverlay] = useState(true)

  // Video edit state (synced from EditClipScreen for PostScreen)
  const [videoTrimStart, setVideoTrimStart] = useState(0)
  const [videoTrimEnd, setVideoTrimEnd] = useState(null)
  const [videoEdits, setVideoEdits] = useState(null)

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

  const handleSaveDraft = async () => {
    try {
      const draftId = `draft-${Date.now()}`

      // Store video blob in IndexedDB (no localStorage size limit)
      if (recordedBlob) {
        await saveDraftBlob(draftId, recordedBlob)
      }

      const existingDrafts = JSON.parse(localStorage.getItem('coolpeople-drafts') || '[]')
      const newDraft = {
        id: draftId,
        type: 'video',
        videoUrl: `idb-draft:${draftId}`,
        selfieVideoUrl: `idb-draft:${draftId}`,
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
        hasSelfieOverlay: true
      }
      localStorage.setItem('coolpeople-drafts', JSON.stringify([newDraft, ...existingDrafts]))
      console.log('Draft saved to IndexedDB + localStorage')
    } catch (e) {
      console.error('Failed to save draft:', e)
    }
    handleDeleteClip()
    onClose?.()
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  const handlePost = async (postData) => {
    if (isPosting) return
    setIsPosting(true)

    let videoUrl = recordedUrl
    let duration = 10

    // Upload selfie video blob to server (mirrors CreateScreen.handlePost)
    if (videoUrl && (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:video/'))) {
      try {
        const resp = await fetch(videoUrl)
        const blob = await resp.blob()

        // Probe duration
        let probedDuration = duration
        try {
          probedDuration = await new Promise((resolve) => {
            const probe = document.createElement('video')
            probe.preload = 'metadata'
            probe.onloadedmetadata = () => {
              resolve(probe.duration && isFinite(probe.duration) ? probe.duration : 30)
              URL.revokeObjectURL(probe.src)
            }
            probe.onerror = () => { resolve(30); URL.revokeObjectURL(probe.src) }
            probe.src = URL.createObjectURL(blob)
          })
        } catch {} // eslint-disable-line no-empty

        const editedSegments = postData.segments
        let serverSegments
        if (editedSegments && editedSegments.length > 0) {
          serverSegments = editedSegments.map(seg => ({
            fileIndex: 0,
            startTime: seg.start,
            endTime: seg.end,
          }))
        } else {
          const start = postData.trimStart ?? 0
          const end = postData.trimEnd ?? probedDuration
          serverSegments = [{ fileIndex: 0, startTime: start, endTime: end }]
        }

        const mimeType = blob.type && blob.type.startsWith('video/') ? blob.type : 'video/webm'
        const ext = mimeType.includes('webm') ? '.webm' : mimeType.includes('quicktime') ? '.mov' : '.mp4'
        const videoFile = new File([blob], `video-0${ext}`, { type: mimeType })

        const formData = new FormData()
        formData.append('videos', videoFile)
        formData.append('segments', JSON.stringify(serverSegments))

        const result = await reelsApi.combineVideos(formData)
        videoUrl = result.data.videoUrl
        duration = result.data.duration || probedDuration

        // Recalculate segments for combined video
        if (editedSegments && editedSegments.length > 1) {
          let cumulative = 0
          const combinedSegments = editedSegments.map(seg => {
            const dur = seg.end - seg.start
            const newSeg = { start: cumulative, end: cumulative + dur }
            cumulative += dur
            return newSeg
          })
          postData.segments = combinedSegments
          postData.trimStart = 0
          postData.trimEnd = cumulative
        }
      } catch (err) {
        console.error('Failed to upload video for quote post:', err)
      }
    }

    duration = Math.max(1, Math.round(duration))

    // Call the same onPostCreated used by CreateScreen (handles reel creation, sending, etc.)
    // Main videoUrl = quoted reel (background), selfieVideoUrl = uploaded selfie (overlay)
    if (onPostCreated) {
      try {
        await onPostCreated({
          ...postData,
          videoUrl: reel.videoUrl,
          selfieVideoUrl: videoUrl,
          duration,
          isMirrored: reel.isMirrored || false,
          isNomination: currentMode === 'nominate',
          taggedUser: reel.user,
          textOverlays,
          selfieSize: showSelfieOverlay ? selfieSize : undefined,
          selfiePosition: showSelfieOverlay ? selfiePosition : undefined,
          showSelfieOverlay,
          selfieIsMirrored: true,
          quotedReelId: reel.id || null,
          quotedReelVideoUrl: reel.videoUrl || null,
          quotedReelUser: reel.user || null,
        })

        // Quoting a reel counts as a repost — increment repost count on the original
        if (reel.id) {
          reelsApi.repostReel(reel.id).catch(err => console.warn('Failed to repost quoted reel:', err))
        }
      } catch (err) {
        console.error('Post creation failed:', err)
      }
    }

    setIsPosting(false)
    setShowPostScreen(false)
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 99995 }}>
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
          isQuoteMode={currentMode === 'quote'}
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
          selfieSize={selfieSize}
          setSelfieSize={setSelfieSize}
          selfiePosition={selfiePosition}
          setSelfiePosition={setSelfiePosition}
          showSelfieOverlay={showSelfieOverlay}
          setShowSelfieOverlay={setShowSelfieOverlay}
          onVideoEditsChange={(edits) => {
            if (edits) {
              setVideoTrimStart(edits.trimStart ?? 0)
              setVideoTrimEnd(edits.trimEnd ?? null)
              setVideoEdits(edits)
            }
          }}
          onCompleteToScoreboard={() => {
            setShowEditClipScreen(false)
            onComplete?.()
          }}
          onSaveDraft={async () => {
            try {
              const draftId = `draft-${Date.now()}`

              if (recordedBlob) {
                await saveDraftBlob(draftId, recordedBlob)
              }

              const existingDrafts = JSON.parse(localStorage.getItem('coolpeople-drafts') || '[]')
              const newDraft = {
                id: draftId,
                type: 'video',
                videoUrl: `idb-draft:${draftId}`,
                selfieVideoUrl: `idb-draft:${draftId}`,
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
                hasSelfieOverlay: true
              }
              localStorage.setItem('coolpeople-drafts', JSON.stringify([newDraft, ...existingDrafts]))
            } catch (e) {
              console.error('Failed to save draft:', e)
            }
            setShowEditClipScreen(false)
            onClose?.()
          }}
        />
      </div>,
      document.body
    )
  }

  if (showPostScreen) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 99995 }}>
        <PostScreen
          onClose={() => {
            setShowPostScreen(false)
            setShowEditClipScreen(true)
          }}
          onPost={handlePost}
          onDraftSaved={() => {
            setShowPostScreen(false)
            handleDeleteClip()
            onClose?.()
          }}
          isQuoteNomination={currentMode !== 'quote'}
          isNominateMode={currentMode === 'nominate'}
          isRaceMode={currentMode === 'race'}
          quotedReel={reel}
          recordedVideoUrl={recordedUrl}
          isMirrored={true}
          taggedUser={reel.user}
          textOverlays={textOverlays}
          raceName={raceName}
          raceDeadline={raceDeadline}
          selfieSize={selfieSize}
          selfiePosition={selfiePosition}
          showSelfieOverlay={showSelfieOverlay}
          showSelfieCam={true}
          selectedSound={selectedSound}
          trimStart={videoTrimStart}
          trimEnd={videoTrimEnd}
          videoEdits={videoEdits}
          conversations={conversations}
          userParty={userParty}
          userRacesFollowing={userRacesFollowing}
          userRacesCompeting={userRacesCompeting}
          currentUserId={currentUser?.id}
        />
      </div>,
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
            className={`quote-reel-video ${reel.isMirrored ? 'mirrored' : ''}`}
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
            <span className="nominate-text">{isQuoteMode ? 'Quote' : 'Nominate'}</span>
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
            {isRecording ? 'Recording...' : `Hold to record ${isQuoteMode ? 'your quote' : 'your nomination'}`}
          </span>
        )}
      </div>

    </div>,
    document.body
  )
}

export default QuoteNominateScreen
