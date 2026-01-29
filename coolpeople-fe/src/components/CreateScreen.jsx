import { useState, useRef, useEffect } from 'react'
import AddSound from './AddSound'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import PartyCreationFlow from './PartyCreationFlow'
import '../styling/CreateScreen.css'

// Mock platform users for tagging
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
  { id: 103, phone: '+1 (555) 345-6789', name: null, isOnPlatform: false },
  { id: 104, phone: '+1 (555) 456-7890', name: 'Sarah K', isOnPlatform: false },
  { id: 105, phone: '+1 (555) 567-8901', name: null, isOnPlatform: false },
  { id: 106, phone: '+1 (555) 678-9012', name: 'Work - John', isOnPlatform: false },
]

function CreateScreen({ onClose, isConversationMode, conversationUser, onSendToConversation, onPartyCreated, onPostCreated, userParty, userRacesFollowing = [], userRacesCompeting = [], conversations = {} }) {
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
  const [raceDeadline, setRaceDeadline] = useState(null)
  const [facingMode, setFacingMode] = useState('user') // 'user' = front, 'environment' = back
  const [cameraError, setCameraError] = useState(null)
  const durations = ['10m', '60s', '15s', 'PHOTO']

  // Nominate mode specific state
  const [showSelfieCam, setShowSelfieCam] = useState(true)
  const [showTagFlow, setShowTagFlow] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [tagSource, setTagSource] = useState('platform') // 'platform', 'contacts', or 'phone'
  const [selectedTag, setSelectedTag] = useState(null)
  const [editingContactName, setEditingContactName] = useState(null)
  const [customContactNames, setCustomContactNames] = useState({})
  const [phoneNumber, setPhoneNumber] = useState('')

  // Text overlays (shared between EditClipScreen and PostScreen)
  const [textOverlays, setTextOverlays] = useState([])
  const [showSentConfirmation, setShowSentConfirmation] = useState(false)

  // Drafts & Media Panel state
  const [showMediaPanel, setShowMediaPanel] = useState(false)
  const [mediaPanelTab, setMediaPanelTab] = useState('recents') // 'recents' or 'drafts'
  // Filter out drafts older than 30 days
  const filterExpiredDrafts = (draftsArray) => {
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30
    return draftsArray.filter(d => d.timestamp > thirtyDaysAgo)
  }

  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem('coolpeople-drafts')
      if (!saved) return []
      const parsed = JSON.parse(saved)
      const filtered = filterExpiredDrafts(parsed)
      // Save back if any were removed
      if (filtered.length !== parsed.length) {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(filtered))
      }
      return filtered
    } catch {
      return []
    }
  })

  // Reload drafts from localStorage (used when returning from PostScreen)
  const reloadDraftsFromStorage = () => {
    try {
      const saved = localStorage.getItem('coolpeople-drafts')
      if (!saved) {
        setDrafts([])
        return
      }
      const parsed = JSON.parse(saved)
      const filtered = filterExpiredDrafts(parsed)
      // Save back if any were removed
      if (filtered.length !== parsed.length) {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(filtered))
      }
      setDrafts(filtered)
    } catch {
      // Keep current state if parse fails
    }
  }

  // Save drafts to localStorage when they change
  useEffect(() => {
    const saveDraftsToStorage = (draftsToSave) => {
      try {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(draftsToSave))
        return true
      } catch (e) {
        if (e.name === 'QuotaExceededError' && draftsToSave.length > 1) {
          console.log('Storage full, removing oldest draft...')
          return saveDraftsToStorage(draftsToSave.slice(0, -1))
        }
        console.error('Failed to save drafts:', e)
        return false
      }
    }
    saveDraftsToStorage(drafts)
  }, [drafts])

  // Clear all drafts - call window.clearDrafts() in browser console
  useEffect(() => {
    window.clearDrafts = () => {
      localStorage.removeItem('coolpeople-drafts')
      setDrafts([])
      console.log('All drafts cleared!')
    }
  }, [])

  // Mock recent media from phone (in real app, this would come from device)
  const mockRecentMedia = [
    { id: 'recent-1', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', timestamp: Date.now() - 1000 * 60 * 5 },
    { id: 'recent-2', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', timestamp: Date.now() - 1000 * 60 * 30 },
    { id: 'recent-3', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', timestamp: Date.now() - 1000 * 60 * 60 },
    { id: 'recent-4', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', timestamp: Date.now() - 1000 * 60 * 60 * 2 },
    { id: 'recent-5', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', timestamp: Date.now() - 1000 * 60 * 60 * 5 },
    { id: 'recent-6', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    { id: 'recent-7', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2 },
    { id: 'recent-8', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=350&fit=crop', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  ]

  // Get combined recents (phone media + drafts from last 30 days)
  const getRecentsWithDrafts = () => {
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30
    const recentDrafts = drafts
      .filter(d => d.timestamp > thirtyDaysAgo)
      .map(d => ({ ...d, isDraft: true }))

    const combined = [...mockRecentMedia, ...recentDrafts]
    return combined.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Capture thumbnail from video
  const captureThumbnail = () => {
    if (!videoRef.current) return null

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 360
      canvas.height = video.videoHeight || 640
      const ctx = canvas.getContext('2d')

      // If mirrored, flip the canvas
      if (recordedWithFrontCamera) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (err) {
      console.error('Error capturing thumbnail:', err)
      return null
    }
  }

  // Save to drafts function
  const saveToDrafts = (videoUrl, isMirrored = false) => {
    const thumbnail = captureThumbnail()

    // Use base64 data for persistent storage, fallback to URL for external videos
    const videoData = recordedVideoBase64 || videoUrl

    const newDraft = {
      id: `draft-${Date.now()}`,
      type: 'video',
      videoUrl: videoData,
      thumbnail: thumbnail || videoData,
      isMirrored,
      timestamp: Date.now(),
      mode: selectedMode,
      raceName: raceName || null,
      raceDeadline: raceDeadline || null,
      taggedUser: selectedTag || null,
      textOverlays: [...textOverlays],
    }
    setDrafts(prev => [newDraft, ...prev])
    return newDraft
  }

  // State for loaded quote nomination draft
  const [loadedQuotedReel, setLoadedQuotedReel] = useState(null)
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false)

  // Load draft into editor
  const loadDraft = (draft) => {
    // For quote nominations, use selfieVideoUrl if available, otherwise videoUrl
    const videoToLoad = draft.isQuoteNomination
      ? (draft.selfieVideoUrl || draft.videoUrl)
      : draft.videoUrl

    console.log('Loading draft:', {
      isQuoteNomination: draft.isQuoteNomination,
      hasSelfieVideoUrl: !!draft.selfieVideoUrl,
      hasVideoUrl: !!draft.videoUrl,
      hasQuotedReel: !!draft.quotedReel,
      videoLength: videoToLoad?.length
    })

    setRecordedVideoUrl(videoToLoad)
    setRecordedWithFrontCamera(draft.isMirrored || false)
    if (draft.mode) setSelectedMode(draft.mode)
    if (draft.raceName) setRaceName(draft.raceName)
    if (draft.raceDeadline) setRaceDeadline(draft.raceDeadline)
    if (draft.taggedUser) setSelectedTag(draft.taggedUser)
    if (draft.textOverlays) setTextOverlays(draft.textOverlays)
    // Handle quote nomination drafts
    if (draft.isQuoteNomination && draft.quotedReel) {
      setLoadedQuotedReel(draft.quotedReel)
    } else {
      setLoadedQuotedReel(null)
    }
    setIsLoadedFromDraft(true)
    setShowMediaPanel(false)
    setShowClipConfirm(false)
    setShowEditClipScreen(true)
  }

  // Load recent media (from phone) into editor
  const loadRecentMedia = (media) => {
    setRecordedVideoUrl(media.videoUrl)
    setRecordedWithFrontCamera(false)
    // Reset any previous draft state
    setSelectedMode('record')
    setRaceName('')
    setRaceDeadline(null)
    setSelectedTag(null)
    setTextOverlays([])
    setShowMediaPanel(false)
    setShowClipConfirm(false)
    setShowEditClipScreen(true)
  }

  // Delete draft
  const deleteDraft = (draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId))
  }

  // Refs
  const videoRef = useRef(null)
  const selfieVideoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [recordedVideoBase64, setRecordedVideoBase64] = useState(null) // Store base64 for drafts
  const [recordedWithFrontCamera, setRecordedWithFrontCamera] = useState(false)

  // Sync selfie video with main video
  const syncSelfieVideo = () => {
    if (videoRef.current && selfieVideoRef.current && recordedVideoUrl) {
      const timeDiff = Math.abs(videoRef.current.currentTime - selfieVideoRef.current.currentTime)
      if (timeDiff > 0.05) {
        selfieVideoRef.current.currentTime = videoRef.current.currentTime
      }
    }
  }

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
    // Only attach live stream when there's no recorded video
    if (!recordedVideoUrl && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [recordedVideoUrl])

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

        // Convert blob to base64 for persistent storage in drafts
        const reader = new FileReader()
        reader.onloadend = () => {
          setRecordedVideoBase64(reader.result)
        }
        reader.readAsDataURL(blob)

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
    // Pause video before transitioning
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setShowClipConfirm(false)
    if (selectedMode === 'party') {
      setShowPartyCreationFlow(true)
    } else if (selectedMode === 'nominate') {
      // Show tag flow for nominate mode
      setShowTagFlow(true)
    } else {
      setShowEditClipScreen(true)
    }
  }

  const handleCloseEditClipScreen = () => {
    // Reset everything back to beginning
    setShowEditClipScreen(false)

    // Clear recorded video
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setRecordedVideoBase64(null)

    // Reset nominate mode state
    setSelectedTag(null)
    setTextOverlays([])
    setShowClipConfirm(false)
    setShowTagFlow(false)
    setLoadedQuotedReel(null)
    setIsLoadedFromDraft(false)

    // Re-attach camera stream
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  const handleNextFromEditClip = () => {
    setShowEditClipScreen(false)
    setShowPostScreen(true)
  }

  // Manage video playback when transitioning between screens
  useEffect(() => {
    if (videoRef.current && recordedVideoUrl) {
      if (showEditClipScreen || showPostScreen || showPartyCreationFlow) {
        // Pause when another screen is shown
        videoRef.current.pause()
      } else {
        // Resume and restart when returning to this screen
        // Use timeout to ensure video element is ready after screen transition
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => {})
          }
        }, 50)
      }
    }
  }, [showEditClipScreen, showPostScreen, showPartyCreationFlow, recordedVideoUrl])

  const handleClosePostScreen = () => {
    setShowPostScreen(false)
    // Reload drafts in case PostScreen saved any
    reloadDraftsFromStorage()
  }

  // Called when draft is saved from PostScreen - resets to camera mode
  const handleDraftSavedFromPostScreen = () => {
    setShowPostScreen(false)

    // Clear recorded video and reset to camera
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setRecordedVideoBase64(null)

    // Reset mode-specific state
    setSelectedTag(null)
    setTextOverlays([])
    setLoadedQuotedReel(null)
    setIsLoadedFromDraft(false)

    // Reload drafts from storage
    reloadDraftsFromStorage()

    // Re-attach camera stream
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  const handlePost = (postData) => {
    console.log('Posting:', postData)

    // Use targetRace from PostScreen if provided, otherwise use raceName from race mode
    const finalTargetRace = postData.targetRace || (selectedMode === 'race' ? raceName : null)

    // Create the post with video and all data
    if (onPostCreated) {
      onPostCreated({
        ...postData,
        videoUrl: recordedVideoUrl,
        isMirrored: recordedWithFrontCamera,
        targetRace: finalTargetRace,
        isNomination: selectedMode === 'nominate',
        taggedUser: selectedTag,
        textOverlays: textOverlays,
      })
    } else {
      setShowPostScreen(false)
      onClose()
    }
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
    setRecordedVideoBase64(null)
    setShowClipConfirm(false)

    // Re-attach camera stream after a brief delay to ensure video element is ready
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  // Tag flow handlers
  const handleSelectTag = (user) => {
    // Toggle selection - clicking selected user deselects them
    if (selectedTag?.id === user.id) {
      setSelectedTag(null)
    } else {
      setSelectedTag(user)
    }
    setTagQuery('')
    setPhoneNumber('')
  }

  const handleConfirmTag = () => {
    // If using phone number, create a phone invite tag
    if (tagSource === 'phone' && phoneNumber.trim()) {
      setSelectedTag({
        id: `phone-${Date.now()}`,
        phone: phoneNumber.trim(),
        name: null,
        isOnPlatform: false,
        isPhoneInvite: true
      })
    }
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleSkipTag = () => {
    setSelectedTag(null)
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleSaveContactName = (contactId, newName) => {
    setCustomContactNames(prev => ({ ...prev, [contactId]: newName }))
    setEditingContactName(null)
  }

  const getFilteredUsers = () => {
    const query = tagQuery.toLowerCase()
    if (tagSource === 'platform') {
      return mockPlatformUsers.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      )
    } else if (tagSource === 'contacts') {
      return mockContacts.filter(contact => {
        const displayName = customContactNames[contact.id] || contact.name || contact.phone
        return displayName.toLowerCase().includes(query)
      })
    }
    return []
  }

  const getContactDisplayName = (contact) => {
    return customContactNames[contact.id] || contact.name || contact.phone
  }

  const filteredUsers = getFilteredUsers()

  // Check if can continue (has selection or valid phone)
  const canContinueTag = selectedTag || (tagSource === 'phone' && phoneNumber.trim().length >= 10)

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
        {recordedVideoUrl ? (
          <video
            key="recorded"
            ref={videoRef}
            src={recordedVideoUrl}
            className={`create-preview-video ${recordedWithFrontCamera ? 'mirrored' : ''}`}
            autoPlay
            loop
            muted
            playsInline
            crossOrigin="anonymous"
            onTimeUpdate={syncSelfieVideo}
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

      {/* Selfie Cam - Live feed during recording phase (before we have recorded video) */}
      {selectedMode === 'nominate' && showSelfieCam && !recordedVideoUrl && !showTagFlow && (
        <div className={`create-selfie-cam ${isRecording ? 'recording' : ''}`}>
          <button className="selfie-cam-remove" onClick={() => setShowSelfieCam(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            className="selfie-cam-video mirrored"
            autoPlay
            muted
            playsInline
            ref={(el) => {
              if (el && streamRef.current) {
                el.srcObject = streamRef.current
              }
            }}
          />
          {isRecording && <div className="selfie-cam-recording-dot" />}
        </div>
      )}

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
      {!showTagFlow && (
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
                  saveToDrafts(recordedVideoUrl, recordedWithFrontCamera)
                  setShowSentConfirmation(true)
                  setTimeout(() => setShowSentConfirmation(false), 1500)
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
      )}

      {/* Tag Flow Overlay - for Nominate mode */}
      {showTagFlow && (
        <div className="nominate-tag-flow">
          {/* Top Section - Selected Tag Display */}
          <div className="tag-top-section">
            {selectedTag ? (
              <div className="selected-tag-display">
                <span className="tag-at">@</span>
                <span className="tag-name">{selectedTag.username || getContactDisplayName(selectedTag)}</span>
              </div>
            ) : tagSource === 'phone' && phoneNumber ? (
              <div className="selected-tag-display">
                <span className="tag-phone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <span className="tag-name">{phoneNumber}</span>
              </div>
            ) : (
              <div className="tag-placeholder-text">Tag someone in your nomination</div>
            )}
          </div>


          {/* Bottom Section - Search & List */}
          <div className="tag-bottom-section">
            {/* Source Toggle */}
            <div className="tag-source-toggle">
              <button
                className={`tag-source-btn ${tagSource === 'platform' ? 'active' : ''}`}
                onClick={() => { setTagSource('platform'); setSelectedTag(null); }}
              >
                On Platform
              </button>
              <button
                className={`tag-source-btn ${tagSource === 'contacts' ? 'active' : ''}`}
                onClick={() => { setTagSource('contacts'); setSelectedTag(null); }}
              >
                Contacts
              </button>
              <button
                className={`tag-source-btn ${tagSource === 'phone' ? 'active' : ''}`}
                onClick={() => { setTagSource('phone'); setSelectedTag(null); }}
              >
                Phone #
              </button>
            </div>

            {/* Search Input or Phone Input */}
            {tagSource === 'phone' ? (
              <div className="tag-phone-input-container">
                <span className="tag-phone-prefix">+1</span>
                <input
                  type="tel"
                  className="tag-phone-input"
                  placeholder="Enter phone number to invite"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                  autoFocus
                />
              </div>
            ) : (
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
            )}

            {/* Users/Contacts List */}
            {tagSource !== 'phone' && (
              <div className="tag-users-list">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`tag-user-item ${selectedTag?.id === user.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTag(user)}
                  >
                    {tagSource === 'platform' ? (
                      <>
                        <img src={user.avatar} alt={user.name} className="tag-user-avatar" />
                        <div className="tag-user-info">
                          <span className="tag-user-name">{user.name}</span>
                          <span className="tag-user-handle">@{user.username}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="tag-contact-avatar">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="tag-user-info">
                          <span className="tag-user-name">{getContactDisplayName(user)}</span>
                          {!user.isOnPlatform && <span className="tag-invite-label">Will receive invite</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Phone invite message */}
            {tagSource === 'phone' && phoneNumber.length >= 10 && (
              <div className="tag-phone-invite-msg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>They'll receive an invite to join and see your nomination</span>
              </div>
            )}
          </div>

          {/* Tag Actions */}
          <div className="tag-flow-actions">
            <button className="tag-skip-btn" onClick={handleSkipTag}>
              Skip
            </button>
            <button
              className="tag-confirm-btn"
              onClick={handleConfirmTag}
              disabled={!canContinueTag}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar with Gallery */}
      {!showTagFlow && (
        <div className="create-bottom-bar">
          <button className="create-gallery-btn" onClick={() => setShowMediaPanel(true)}>
            <img
              src={drafts.length > 0 ? drafts[0].thumbnail : "https://images.unsplash.com/photo-1551632811-561732d1e306?w=100&h=100&fit=crop"}
              alt="Gallery"
            />
            {drafts.length > 0 && <span className="gallery-draft-badge">{drafts.length}</span>}
          </button>
        </div>
      )}

      {/* Media Panel (Drafts & Recents) */}
      {showMediaPanel && (
        <div className="media-panel-overlay" onClick={() => setShowMediaPanel(false)}>
          <div className="media-panel" onClick={(e) => e.stopPropagation()}>
            {/* Tab Header */}
            <div className="media-panel-header">
              <button
                className={`media-panel-tab ${mediaPanelTab === 'recents' ? 'active' : ''}`}
                onClick={() => setMediaPanelTab('recents')}
              >
                Recents
              </button>
              <button
                className={`media-panel-tab ${mediaPanelTab === 'drafts' ? 'active' : ''}`}
                onClick={() => setMediaPanelTab('drafts')}
              >
                Drafts
              </button>
            </div>

            {/* Media Grid */}
            <div className="media-panel-grid">
              {mediaPanelTab === 'recents' ? (
                getRecentsWithDrafts().map(item => {
                  // Determine what to show as main content
                  const mainThumbnail = item.isDraft && item.isQuoteNomination && item.quotedReel?.thumbnail
                    ? item.quotedReel.thumbnail
                    : item.thumbnail
                  const mainVideo = item.isDraft ? item.videoUrl : null

                  return (
                    <div
                      key={item.id}
                      className={`media-grid-item ${item.isDraft && (item.isQuoteNomination || item.mode === 'nominate') ? 'draft-item' : ''}`}
                      onClick={() => item.isDraft ? loadDraft(item) : loadRecentMedia(item)}
                    >
                      {/* Main content - thumbnail or video fallback */}
                      {mainThumbnail ? (
                        <img src={mainThumbnail} alt="" className={item.isMirrored ? 'mirrored' : ''} />
                      ) : mainVideo ? (
                        <video src={mainVideo} autoPlay loop muted playsInline className={`media-grid-video ${item.isMirrored ? 'mirrored' : ''}`} />
                      ) : (
                        <div className="media-grid-placeholder" />
                      )}

                      {/* Selfie overlay for nominate mode drafts in recents */}
                      {item.isDraft && (item.isQuoteNomination || item.mode === 'nominate') && (item.selfieVideoUrl || item.videoUrl) && (
                        <div className="draft-selfie-overlay">
                          <video src={item.selfieVideoUrl || item.videoUrl} autoPlay loop muted playsInline />
                        </div>
                      )}

                      {item.type === 'video' && (
                        <div className="media-item-video-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      )}
                      {item.isDraft && (
                        <div className="media-item-draft-badge">draft</div>
                      )}
                    </div>
                  )
                })
              ) : (
                drafts.length > 0 ? (
                  drafts.map(draft => {
                    // Determine what to show as main content
                    const mainThumbnail = draft.isQuoteNomination && draft.quotedReel?.thumbnail
                      ? draft.quotedReel.thumbnail
                      : draft.thumbnail
                    const mainVideo = draft.videoUrl

                    return (
                      <div
                        key={draft.id}
                        className={`media-grid-item draft-item ${draft.isQuoteNomination ? 'quote-draft' : ''}`}
                        onClick={() => loadDraft(draft)}
                      >
                        {/* Main content - thumbnail or video fallback */}
                        {mainThumbnail ? (
                          <img src={mainThumbnail} alt="" className={draft.isMirrored ? 'mirrored' : ''} />
                        ) : mainVideo ? (
                          <video src={mainVideo} autoPlay loop muted playsInline className={`media-grid-video ${draft.isMirrored ? 'mirrored' : ''}`} />
                        ) : (
                          <div className="media-grid-placeholder" />
                        )}

                      {/* Selfie overlay for nominate mode drafts (including quote nominations) */}
                      {(draft.isQuoteNomination || draft.mode === 'nominate') && (draft.selfieVideoUrl || draft.videoUrl) && (
                        <div className="draft-selfie-overlay">
                          <video src={draft.selfieVideoUrl || draft.videoUrl} autoPlay loop muted playsInline />
                        </div>
                      )}

                      {/* Tag overlay for nominate mode */}
                      {draft.taggedUser && (
                        <div className="draft-tag-overlay">
                          <span className="draft-tag-at">@</span>
                          <span className="draft-tag-name">{draft.taggedUser.username || draft.taggedUser.name}</span>
                        </div>
                      )}

                      {/* Race pill overlay */}
                      {draft.mode === 'race' && draft.raceName && (
                        <div className="draft-race-pill">
                          <span className="draft-race-dot"></span>
                          <span>{draft.raceName}</span>
                        </div>
                      )}

                      <div className="media-item-video-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                      <button
                        className="draft-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteDraft(draft.id)
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                      <div className={`draft-mode-badge ${draft.mode === 'race' ? 'race' : draft.mode === 'nominate' ? 'nominate' : draft.mode === 'party' ? 'party' : ''}`}>
                        {draft.isQuoteNomination ? 'Quote' : draft.mode === 'race' ? 'Race' : draft.mode === 'nominate' ? 'Nominate' : draft.mode === 'party' ? 'Party' : 'Post'}
                      </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="media-panel-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>No drafts yet</span>
                    <p>Save videos to continue editing later</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sent Confirmation Animation */}
      {showSentConfirmation && (
        <div className="sent-confirmation">
          <div className="sent-check-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#sentGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="sentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F2EA" />
                  <stop offset="100%" stopColor="#FF2A55" />
                </linearGradient>
              </defs>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      )}

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
          isNominateMode={selectedMode === 'nominate'}
          raceName={raceName}
          onRaceNameChange={setRaceName}
          raceDeadline={raceDeadline}
          onRaceDeadlineChange={setRaceDeadline}
          recordedVideoUrl={recordedVideoUrl}
          isMirrored={recordedWithFrontCamera}
          isConversationMode={isConversationMode}
          conversationUser={conversationUser}
          taggedUser={selectedTag}
          getContactDisplayName={getContactDisplayName}
          textOverlays={textOverlays}
          setTextOverlays={setTextOverlays}
          onSend={(recipients) => {
            console.log('Sending to:', recipients)
            onSendToConversation?.(recordedVideoUrl, recordedWithFrontCamera)
          }}
          onCompleteToScoreboard={() => {
            // Close edit screen and show sent confirmation
            setShowEditClipScreen(false)
            setShowSentConfirmation(true)
            // Hide confirmation after animation
            setTimeout(() => {
              setShowSentConfirmation(false)
            }, 1500)
          }}
          onSaveDraft={() => {
            saveToDrafts(recordedVideoUrl, recordedWithFrontCamera)
            setShowSentConfirmation(true)
            setTimeout(() => setShowSentConfirmation(false), 1500)
            handleCloseEditClipScreen()
          }}
          currentMode={selectedMode}
          onModeChange={setSelectedMode}
          quotedReel={loadedQuotedReel}
          isFromDraft={isLoadedFromDraft}
        />
      )}

      {/* Post Screen */}
      {showPostScreen && (
        <PostScreen
          onClose={handleClosePostScreen}
          onPost={handlePost}
          onDraftSaved={handleDraftSavedFromPostScreen}
          isRaceMode={selectedMode === 'race'}
          isNominateMode={selectedMode === 'nominate'}
          raceName={raceName}
          raceDeadline={raceDeadline}
          recordedVideoUrl={recordedVideoUrl}
          recordedVideoBase64={recordedVideoBase64}
          isMirrored={recordedWithFrontCamera}
          showSelfieCam={showSelfieCam}
          taggedUser={selectedTag}
          getContactDisplayName={getContactDisplayName}
          textOverlays={textOverlays}
          userParty={userParty}
          userRacesFollowing={userRacesFollowing}
          userRacesCompeting={userRacesCompeting}
          conversations={conversations}
          isQuoteNomination={!!loadedQuotedReel}
          quotedReel={loadedQuotedReel}
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

      {/* Selfie Cam - Rendered last to appear on top of all screens (hidden during tag flow, post screen, and edit clip screen) */}
      {selectedMode === 'nominate' && showSelfieCam && recordedVideoUrl && !showTagFlow && !showPostScreen && !showEditClipScreen && (
        <div className={`create-selfie-cam ${isRecording ? 'recording' : ''}`}>
          <button className="selfie-cam-remove" onClick={() => setShowSelfieCam(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            ref={selfieVideoRef}
            className={`selfie-cam-video ${recordedWithFrontCamera ? 'mirrored' : ''}`}
            src={recordedVideoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      )}

    </div>
  )
}

export default CreateScreen
