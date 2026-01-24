import { useState, useRef, useEffect } from 'react'
import '../styling/PartyCreationFlow.css'

function PartyCreationFlow({ onClose, onComplete, recordedVideoUrl, isMirrored }) {
  // Basic Info
  const [partyHandle, setPartyHandle] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyBio, setPartyBio] = useState('')
  const [partyPhoto, setPartyPhoto] = useState(null)
  const [partyPhotoPreview, setPartyPhotoPreview] = useState(null)
  const [partyColor, setPartyColor] = useState('#FF2A55')
  const [showPhotoEditor, setShowPhotoEditor] = useState(false)
  const [tempPhotoPreview, setTempPhotoPreview] = useState(null)
  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const editorCanvasRef = useRef(null)
  const editorImageRef = useRef(null)

  // Restart video from beginning when screen mounts
  useEffect(() => {
    if (videoRef.current && recordedVideoUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
    // Cleanup - pause when unmounting
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [])

  // Capture a frame from the video as avatar if no photo is set
  const captureVideoFrame = () => {
    if (!videoRef.current) return null
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 150
      canvas.height = video.videoHeight || 150
      const ctx = canvas.getContext('2d')

      // If mirrored, flip the canvas
      if (isMirrored) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (err) {
      console.error('Error capturing video frame:', err)
      return null
    }
  }

  // Party Type & Privacy
  const [partyType, setPartyType] = useState('open') // 'open', 'closed'
  const [partyPrivacy, setPartyPrivacy] = useState('public') // 'public', 'private'

  // Admin & Member Setup
  const [adminInvites, setAdminInvites] = useState([])
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [memberInvites, setMemberInvites] = useState([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Permissions
  const [adminPermissions, setAdminPermissions] = useState({
    canAddPosts: true,
    canBlockPosts: true,
    canSilenceMembers: true,
    canRemoveMembers: true,
    canApproveJoins: true,
    canPinPosts: true
  })
  const [memberPermissions, setMemberPermissions] = useState({
    canPost: true,
    canMessage: true
  })

  // Post Settings (like PostScreen)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [selectedPostTo, setSelectedPostTo] = useState(['Your Feed']) // Array for multi-select
  const [selectedSendTo, setSelectedSendTo] = useState([])

  const togglePostTo = (option) => {
    setSelectedPostTo(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    )
  }
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedSocials, setSelectedSocials] = useState([])

  const targetRaces = ['Mayor Race', 'City Council', 'Governor', 'Senate']
  const sendToOptions = ['Mamas gaga', 'Sunday Canvassing', 'Local Activists']
  const locationOptions = ['Dumbo', 'Brooklyn', 'Manhattan', 'Queens']

  // Mock users for search
  const mockUsers = [
    { id: 1, username: 'sarah_politics', name: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/100?img=1' },
    { id: 2, username: 'mike_civic', name: 'Mike Chen', avatar: 'https://i.pravatar.cc/100?img=2' },
    { id: 3, username: 'alex_voter', name: 'Alex Rivera', avatar: 'https://i.pravatar.cc/100?img=3' },
    { id: 4, username: 'jordan_2024', name: 'Jordan Smith', avatar: 'https://i.pravatar.cc/100?img=4' },
    { id: 5, username: 'casey_local', name: 'Casey Williams', avatar: 'https://i.pravatar.cc/100?img=5' },
    { id: 6, username: 'taylor_vote', name: 'Taylor Brown', avatar: 'https://i.pravatar.cc/100?img=6' },
  ]

  const filteredAdminUsers = mockUsers.filter(user =>
    !adminInvites.find(a => a.id === user.id) &&
    !memberInvites.find(m => m.id === user.id) &&
    adminSearchQuery &&
    (user.username.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
     user.name.toLowerCase().includes(adminSearchQuery.toLowerCase()))
  )

  const filteredMemberUsers = mockUsers.filter(user =>
    !adminInvites.find(a => a.id === user.id) &&
    !memberInvites.find(m => m.id === user.id) &&
    memberSearchQuery &&
    (user.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
     user.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  )

  const partyColors = [
    '#FF2A55', '#00F2EA', '#7C3AED', '#10B981', '#F59E0B', '#3B82F6',
    '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#EAB308', '#E11D48', '#0EA5E9'
  ]

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPartyPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempPhotoPreview(reader.result)
        setPhotoZoom(1)
        setPhotoPosition({ x: 0, y: 0 })
        setShowPhotoEditor(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Photo editor drag handlers
  const handleEditorMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX - photoPosition.x, y: clientY - photoPosition.y })
  }

  const handleEditorMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setPhotoPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    })
  }

  const handleEditorMouseUp = () => {
    setIsDragging(false)
  }

  // Save cropped photo
  const handleSavePhoto = () => {
    if (!editorImageRef.current) return

    const img = editorImageRef.current
    const canvas = document.createElement('canvas')
    const size = 300 // Output size
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Calculate the visible area based on zoom and position
    const containerSize = 250 // Editor container size
    const scale = photoZoom
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight

    // Calculate how the image is displayed
    const displayedWidth = containerSize * scale
    const displayedHeight = (imgHeight / imgWidth) * containerSize * scale

    // Calculate source coordinates (what part of the image is visible)
    const offsetX = (containerSize / 2 - photoPosition.x) / scale
    const offsetY = (containerSize / 2 - photoPosition.y) / scale
    const visibleSize = containerSize / scale

    // Source rectangle from original image
    const sourceX = (offsetX - visibleSize / 2) * (imgWidth / containerSize)
    const sourceY = (offsetY - visibleSize / 2) * (imgHeight / containerSize)
    const sourceSize = visibleSize * (imgWidth / containerSize)

    // Draw the cropped image
    ctx.drawImage(
      img,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(sourceSize, imgWidth),
      Math.min(sourceSize, imgHeight),
      0,
      0,
      size,
      size
    )

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPartyPhotoPreview(croppedDataUrl)
    setShowPhotoEditor(false)
  }

  const handleCancelPhotoEdit = () => {
    setShowPhotoEditor(false)
    setTempPhotoPreview(null)
    setPhotoZoom(1)
    setPhotoPosition({ x: 0, y: 0 })
  }

  const handleAddAdmin = (user) => {
    setAdminInvites([...adminInvites, user])
    setAdminSearchQuery('')
  }

  const handleRemoveAdmin = (userId) => {
    setAdminInvites(adminInvites.filter(a => a.id !== userId))
  }

  const handleAddMember = (user) => {
    setMemberInvites([...memberInvites, user])
    setMemberSearchQuery('')
  }

  const handleRemoveMember = (userId) => {
    setMemberInvites(memberInvites.filter(m => m.id !== userId))
  }

  const toggleSendTo = (option) => {
    setSelectedSendTo(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    )
  }

  const toggleSocial = (social) => {
    setSelectedSocials(prev =>
      prev.includes(social)
        ? prev.filter(s => s !== social)
        : [...prev, social]
    )
  }

  const getSocialOrder = (social) => {
    const index = selectedSocials.indexOf(social)
    return index >= 0 ? index + 1 : null
  }

  // Show confirmation dialog before creating party
  const handleCreateParty = () => {
    setShowConfirmation(true)
  }

  // Helper to strip "Party" suffix if user typed it (since we auto-add it)
  const stripPartySuffix = (name) => {
    const trimmed = name.trim()
    // Remove "Party" from end (case-insensitive)
    if (trimmed.toLowerCase().endsWith(' party')) {
      return trimmed.slice(0, -6).trim()
    }
    if (trimmed.toLowerCase() === 'party') {
      return ''
    }
    return trimmed
  }

  // Helper to convert to title case (capitalize first letter of each word)
  // except for common small words (unless it's the first word)
  const toTitleCase = (str) => {
    if (!str) return ''
    const smallWords = ['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'a', 'an', 'but', 'or', 'nor', 'by']
    return str
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (index === 0 || !smallWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1)
        }
        return word
      })
      .join(' ')
  }

  // Combined helper: strip suffix and apply title case
  const formatPartyName = (name) => {
    return toTitleCase(stripPartySuffix(name))
  }

  // Actually create the party after confirmation
  const confirmCreateParty = () => {
    setShowConfirmation(false)
    // Display name with "Party" suffix (strip if user already typed it, apply title case)
    const cleanName = formatPartyName(partyName)
    const cleanHandle = formatPartyName(partyHandle)
    const displayName = cleanName ? `${cleanName} Party` : `${cleanHandle} Party`

    // Use uploaded photo preview (data URL) or capture a frame from the video
    const avatarPhoto = partyPhotoPreview || captureVideoFrame()

    const partyData = {
      name: displayName,
      handle: partyHandle,
      bio: partyBio,
      photo: avatarPhoto,
      color: partyColor,
      introVideo: recordedVideoUrl,
      introVideoMirrored: isMirrored,
      type: partyType,
      privacy: partyPrivacy,
      requireApproval: partyType === 'closed', // closed requires approval
      allowMemberInvites: true, // members can always invite
      adminInvites,
      memberInvites,
      adminPermissions,
      memberPermissions,
      postSettings: {
        target: selectedTarget,
        postTo: selectedPostTo,
        sendTo: selectedSendTo,
        location: selectedLocation,
        shareTo: selectedSocials
      },
      // Baseline stats for new party (mirrors new candidate profiles)
      stats: {
        members: 1, // Just the creator
        followers: 0,
        posts: 0,
        cpPoints: 100, // Starting in Bronze tier (0-999)
        tier: 'Bronze',
        change: '+0.00',
        chartChange: '+0.0%',
        sparklineData: [100, 100, 100, 100, 100, 100, 100], // Flat baseline at starting points
        ranking: 'New'
      },
      // New parties only race in Best Party until they grow
      races: ['Best Party'],
      // Empty reviews until people leave them
      reviews: [],
      testimonials: {
        cpVerified: [], // CP verified member testimonials
        community: []   // Community member testimonials
      },
      // Empty icebreakers - party can add them later
      icebreakers: {
        topicsThatEnergize: { title: 'Topics that energize us', tags: [] },
        guessWhichTrue: { title: 'Guess Which One is True', options: ['', '', ''], correctIndex: null },
        customWritten: [],
        customSliders: []
      },
      isNewParty: true, // Flag for starter party display logic
      createdAt: new Date().toISOString()
    }
    console.log('Creating party:', partyData)
    onComplete?.(partyData)
  }

  const canCreate = partyHandle.trim().length >= 3

  return (
    <div className="party-screen">
      {/* Header */}
      <button className="party-back-btn" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="party-content">
        {/* Video Preview */}
        <div className="party-video-preview">
          {recordedVideoUrl ? (
            <video
              ref={videoRef}
              src={recordedVideoUrl}
              className={isMirrored ? 'mirrored' : ''}
              autoPlay
              loop
              playsInline
            />
          ) : (
            <div className="party-video-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
          )}
          <button className="party-edit-cover-btn">
            Edit<br/>Cover
          </button>
          <button className="party-edit-video-btn">
            Edit<br/>Video
          </button>
        </div>

        {/* Party Photo */}
        <div className="party-photo-row">
          <button
            className="party-photo-btn"
            onClick={() => {
              if (partyPhotoPreview && tempPhotoPreview) {
                // Re-open editor for existing photo
                setShowPhotoEditor(true)
              } else {
                // Select new photo
                fileInputRef.current?.click()
              }
            }}
            style={{ borderColor: partyColor }}
          >
            {partyPhotoPreview ? (
              <>
                <img src={partyPhotoPreview} alt="Party" />
                <div className="party-photo-edit-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              </>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
          <div className="party-color-row">
            {partyColors.map(color => (
              <button
                key={color}
                className={`party-color-btn ${partyColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setPartyColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Party Handle */}
        <div className="party-handle-row">
          <span className="party-handle-at">@</span>
          <input
            type="text"
            className="party-handle-input"
            placeholder="partyhandle"
            value={partyHandle}
            onChange={(e) => setPartyHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            maxLength={20}
          />
        </div>

        {/* Party Name */}
        <div className="party-name-row">
          <input
            type="text"
            className="party-name-input"
            placeholder="Party Name"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            maxLength={30}
          />
          <span className="party-name-suffix">Party</span>
        </div>

        {/* Bio */}
        <textarea
          className="party-desc-input"
          placeholder="Party bio"
          value={partyBio}
          onChange={(e) => setPartyBio(e.target.value)}
          maxLength={250}
        />

        {/* Party Type */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Party Type</span>
          <div className="party-type-tags">
            <button
              className={`party-type-tag ${partyType === 'open' ? 'active' : ''}`}
              onClick={() => setPartyType('open')}
            >
              Open
            </button>
            <button
              className={`party-type-tag ${partyType === 'closed' ? 'active' : ''}`}
              onClick={() => setPartyType('closed')}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Party Privacy */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Party Privacy</span>
          <div className="party-type-tags">
            <button
              className={`party-type-tag ${partyPrivacy === 'public' ? 'active' : ''}`}
              onClick={() => setPartyPrivacy('public')}
            >
              {partyPrivacy === 'public' ? 'Public (Recommended)' : 'Public'}
            </button>
            <button
              className={`party-type-tag ${partyPrivacy === 'private' ? 'active' : ''}`}
              onClick={() => setPartyPrivacy('private')}
            >
              Private
            </button>
          </div>
        </div>

        {/* Invite Admins */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Invite Admins</span>
          <div className="party-admin-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
            />
          </div>

          {filteredAdminUsers.length > 0 && (
            <div className="party-search-results">
              {filteredAdminUsers.map(user => (
                <button key={user.id} className="party-user-row" onClick={() => handleAddAdmin(user)}>
                  <img src={user.avatar} alt={user.name} />
                  <div className="party-user-info">
                    <span className="party-user-name">{user.name}</span>
                    <span className="party-user-handle">@{user.username}</span>
                  </div>
                  <span className="party-add-text">+ Add</span>
                </button>
              ))}
            </div>
          )}

          {adminInvites.length > 0 && (
            <div className="party-admin-list">
              {adminInvites.map(admin => (
                <div key={admin.id} className="party-admin-chip">
                  <img src={admin.avatar} alt={admin.name} />
                  <span>@{admin.username}</span>
                  <button onClick={() => handleRemoveAdmin(admin.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Members */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Invite Members</span>
          <div className="party-admin-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
            />
          </div>

          {filteredMemberUsers.length > 0 && (
            <div className="party-search-results">
              {filteredMemberUsers.map(user => (
                <button key={user.id} className="party-user-row" onClick={() => handleAddMember(user)}>
                  <img src={user.avatar} alt={user.name} />
                  <div className="party-user-info">
                    <span className="party-user-name">{user.name}</span>
                    <span className="party-user-handle">@{user.username}</span>
                  </div>
                  <span className="party-add-text">+ Add</span>
                </button>
              ))}
            </div>
          )}

          {memberInvites.length > 0 && (
            <div className="party-admin-list">
              {memberInvites.map(member => (
                <div key={member.id} className="party-admin-chip">
                  <img src={member.avatar} alt={member.name} />
                  <span>@{member.username}</span>
                  <button onClick={() => handleRemoveMember(member.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Permissions */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Admin Permissions</span>
          <div className="party-permissions">
            {[
              { key: 'canAddPosts', label: 'Add Posts' },
              { key: 'canBlockPosts', label: 'Block Posts' },
              { key: 'canSilenceMembers', label: 'Silence Members' },
              { key: 'canRemoveMembers', label: 'Remove Members' },
              { key: 'canApproveJoins', label: 'Approve Joins' },
              { key: 'canPinPosts', label: 'Pin Posts' }
            ].map(perm => (
              <button
                key={perm.key}
                className={`party-perm-tag ${adminPermissions[perm.key] ? 'active' : ''}`}
                onClick={() => setAdminPermissions({
                  ...adminPermissions,
                  [perm.key]: !adminPermissions[perm.key]
                })}
              >
                {perm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member Permissions */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Member Permissions</span>
          <div className="party-permissions">
            {[
              { key: 'canPost', label: 'Post Content' },
              { key: 'canMessage', label: 'Message' }
            ].map(perm => (
              <button
                key={perm.key}
                className={`party-perm-tag ${memberPermissions[perm.key] ? 'active' : ''}`}
                onClick={() => setMemberPermissions({
                  ...memberPermissions,
                  [perm.key]: !memberPermissions[perm.key]
                })}
              >
                {perm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="party-section-divider">
          <span>Post Settings</span>
        </div>

        {/* Video Preview for Post */}
        <div className="party-post-video-preview">
          {recordedVideoUrl ? (
            <video
              src={recordedVideoUrl}
              className={isMirrored ? 'mirrored' : ''}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div className="party-video-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
          )}
          <button className="party-edit-cover-btn small">
            Edit<br/>Cover
          </button>
          <button className="party-edit-video-btn small">
            Edit<br/>Video
          </button>
        </div>

        {/* Target Race */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Target</span>
          <div className="party-type-tags">
            {targetRaces.map(race => (
              <button
                key={race}
                className={`party-target-tag ${selectedTarget === race ? 'active' : ''}`}
                onClick={() => setSelectedTarget(selectedTarget === race ? null : race)}
              >
                {selectedTarget === race && <span className="party-target-dot"></span>}
                {race}
              </button>
            ))}
          </div>
        </div>

        {/* Post To - Multi-select */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Post To</span>
          <div className="party-type-tags">
            <button
              className={`party-type-tag ${selectedPostTo.includes('Your Feed') ? 'active' : ''}`}
              onClick={() => togglePostTo('Your Feed')}
            >
              Your Feed
            </button>
            {(partyName || partyHandle) && (
              <button
                className={`party-type-tag ${selectedPostTo.includes(`${formatPartyName(partyName) || formatPartyName(partyHandle)} Party`) ? 'active' : ''}`}
                onClick={() => togglePostTo(`${formatPartyName(partyName) || formatPartyName(partyHandle)} Party`)}
              >
                {formatPartyName(partyName) || formatPartyName(partyHandle)} Party
              </button>
            )}
          </div>
        </div>

        {/* Send To */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Send To</span>
          <div className="party-type-tags">
            {sendToOptions.map(option => (
              <button
                key={option}
                className={`party-type-tag ${selectedSendTo.includes(option) ? 'active' : ''}`}
                onClick={() => toggleSendTo(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="party-option-row stacked">
          <span className="party-option-label">Location</span>
          <div className="party-location-tags">
            {locationOptions.map(option => (
              <button
                key={option}
                className={`party-location-tag ${selectedLocation === option ? 'active' : ''}`}
                onClick={() => setSelectedLocation(selectedLocation === option ? null : option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Share To */}
        <div className="party-option-row">
          <span className="party-option-label">Share to</span>
          <div className="party-share-icons">
            <button className="party-share-btn instagram" onClick={() => toggleSocial('instagram')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {getSocialOrder('instagram') && <span className="party-share-badge">{getSocialOrder('instagram')}</span>}
            </button>
            <button className="party-share-btn facebook" onClick={() => toggleSocial('facebook')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {getSocialOrder('facebook') && <span className="party-share-badge">{getSocialOrder('facebook')}</span>}
            </button>
            <button className="party-share-btn whatsapp" onClick={() => toggleSocial('whatsapp')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {getSocialOrder('whatsapp') && <span className="party-share-badge">{getSocialOrder('whatsapp')}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="party-bottom-actions">
        <button className="party-drafts-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Drafts
        </button>
        <button
          className="party-submit-btn"
          onClick={handleCreateParty}
          disabled={!canCreate}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          Post
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="party-confirm-overlay">
          <div className="party-confirm-dialog">
            <div className="party-confirm-icon" style={{ background: partyColor }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="party-confirm-title">Create {formatPartyName(partyName) || formatPartyName(partyHandle)} Party?</h3>
            <p className="party-confirm-message">
              You're currently <strong>Independent</strong>. Creating this party will change your affiliation from Independent to <strong style={{ color: partyColor }}>{formatPartyName(partyName) || formatPartyName(partyHandle)} Party</strong>.
            </p>
            <div className="party-confirm-actions">
              <button className="party-confirm-cancel" onClick={() => setShowConfirmation(false)}>
                Stay Independent
              </button>
              <button className="party-confirm-create" style={{ background: partyColor }} onClick={confirmCreateParty}>
                Create Party
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Editor Modal */}
      {showPhotoEditor && tempPhotoPreview && (
        <div className="photo-editor-overlay">
          <div className="photo-editor-modal">
            <div className="photo-editor-header">
              <button className="photo-editor-cancel" onClick={handleCancelPhotoEdit}>
                Cancel
              </button>
              <span className="photo-editor-title">Adjust Photo</span>
              <button className="photo-editor-save" onClick={handleSavePhoto}>
                Done
              </button>
            </div>

            <div className="photo-editor-instructions">
              Drag to reposition
            </div>

            <div
              className="photo-editor-container"
              onMouseDown={handleEditorMouseDown}
              onMouseMove={handleEditorMouseMove}
              onMouseUp={handleEditorMouseUp}
              onMouseLeave={handleEditorMouseUp}
              onTouchStart={handleEditorMouseDown}
              onTouchMove={handleEditorMouseMove}
              onTouchEnd={handleEditorMouseUp}
            >
              <div className="photo-editor-circle">
                <img
                  ref={editorImageRef}
                  src={tempPhotoPreview}
                  alt="Edit"
                  className="photo-editor-image"
                  style={{
                    transform: `translate(${photoPosition.x}px, ${photoPosition.y}px) scale(${photoZoom})`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="photo-editor-zoom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={photoZoom}
                onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                className="photo-editor-slider"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>

            <button
              className="photo-editor-change"
              onClick={() => {
                setShowPhotoEditor(false)
                fileInputRef.current?.click()
              }}
            >
              Change Photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PartyCreationFlow
