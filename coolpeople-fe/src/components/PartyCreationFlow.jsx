import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import '../styling/PartyCreationFlow.css'
import { usersApi, favoritesApi, partiesApi, searchApi } from '../services/api'

function PartyCreationFlow({ onClose, onComplete, recordedVideoUrl, recordedVideoBase64, isMirrored, currentUserId, conversations = {}, prefilledData = null }) {
  // Check if this is a conversion from groupchat
  const isFromGroupChat = prefilledData?.isFromGroupChat || false
  const groupChatName = prefilledData?.groupChatName || null

  // Basic Info - pre-fill from groupchat if available
  const [partyHandle, setPartyHandle] = useState('')
  const [partyName, setPartyName] = useState(prefilledData?.defaultName || '')
  const [partyBio, setPartyBio] = useState('')

  // Name availability warnings
  const [nameWarning, setNameWarning] = useState('')
  const [handleWarning, setHandleWarning] = useState('')
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isCheckingHandle, setIsCheckingHandle] = useState(false)
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

  // Admin & Member Setup - don't pre-fill individual members when converting from groupchat
  const [adminInvites, setAdminInvites] = useState([])
  const [memberInvites, setMemberInvites] = useState(isFromGroupChat ? [] : (prefilledData?.memberInvites || []))

  // User picker modal state
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [userPickerMode, setUserPickerMode] = useState('admin') // 'admin' or 'member'
  const [userPickerSearch, setUserPickerSearch] = useState('')
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const userPickerSearchRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Fetch and rank suggested users when picker opens
  useEffect(() => {
    console.log('User picker effect:', { showUserPicker, currentUserId })
    if (!showUserPicker || !currentUserId) return

    const fetchSuggestedUsers = async () => {
      setIsLoadingUsers(true)
      try {
        // Fetch ALL users AND relationship data in parallel
        const [allUsersRes, followersRes, followingRes, favoritesRes] = await Promise.all([
          searchApi.search('', { type: 'users', limit: 100 }).catch((err) => { console.log('All users error:', err); return { users: [] } }),
          usersApi.getFollowers(currentUserId).catch((err) => { console.log('Followers error:', err); return { data: [] } }),
          usersApi.getFollowing(currentUserId).catch((err) => { console.log('Following error:', err); return { data: [] } }),
          favoritesApi.getFavorites().catch((err) => { console.log('Favorites error:', err); return { data: [] } })
        ])

        console.log('API responses:', { allUsersRes, followersRes, followingRes, favoritesRes })

        // Extract all users from search
        const allUsers = allUsersRes.data?.users || allUsersRes.users || []

        // Extract relationship data
        const followers = followersRes.data?.followers || followersRes.followers || []
        const following = followingRes.data?.following || followingRes.following || []
        const favorites = Array.isArray(favoritesRes.data) ? favoritesRes.data : (favoritesRes.favorites || [])

        console.log('Parsed data:', { allUsersCount: allUsers.length, followers: followers.length, following: following.length, favorites: favorites.length })

        // Create sets for quick lookup
        const followerIds = new Set(followers.map(f => f.id))
        const followingIds = new Set(following.map(f => f.id))
        const favoriteIds = new Set(favorites.map(f => f.favoritedUser?.id || f.id))

        // Get conversation partner IDs (users you've messaged)
        const conversationUserIds = new Set(
          Object.values(conversations)
            .filter(c => c.participantId || c.userId)
            .map(c => c.participantId || c.userId)
        )

        // Score all users based on relationship
        const scoredUsers = allUsers
          .filter(u => u.id !== currentUserId)
          .map(user => {
            let score = 0
            const reasons = []

            // Mutual = follow each other = highest priority
            if (followerIds.has(user.id) && followingIds.has(user.id)) {
              score += 100
              reasons.push('mutual')
            }

            // Favorites = explicitly marked as important
            if (favoriteIds.has(user.id)) {
              score += 80
              reasons.push('favorite')
            }

            // Recent conversations = active engagement
            if (conversationUserIds.has(user.id)) {
              score += 60
              reasons.push('messaged')
            }

            // Followers = they're interested in you
            if (followerIds.has(user.id) && !reasons.includes('mutual')) {
              score += 40
              reasons.push('follower')
            }

            // Following = you're interested in them
            if (followingIds.has(user.id) && !reasons.includes('mutual')) {
              score += 20
              reasons.push('following')
            }

            return {
              id: user.id,
              username: user.username,
              name: user.displayName || user.name,
              avatar: user.avatarUrl || user.avatar,
              userType: user.userType,
              score,
              reasons
            }
          })
          .sort((a, b) => b.score - a.score)

        console.log('Scored users:', scoredUsers.length)
        setSuggestedUsers(scoredUsers)
      } catch (error) {
        console.error('Error fetching suggested users:', error)
        setSuggestedUsers([])
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchSuggestedUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUserPicker, currentUserId])

  // Focus search input when picker opens
  useEffect(() => {
    if (showUserPicker && userPickerSearchRef.current) {
      setTimeout(() => userPickerSearchRef.current?.focus(), 100)
    }
  }, [showUserPicker])

  // Search all users when search query changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If no search query, clear search results
    if (!userPickerSearch || userPickerSearch.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Debounce search
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchApi.search(userPickerSearch, { type: 'users' })
        const users = response.data?.users || response.users || []
        // Transform to match our user format
        const transformedUsers = users
          .filter(u => u.id !== currentUserId)
          .map(u => ({
            id: u.id,
            username: u.username,
            name: u.displayName || u.name,
            avatar: u.avatarUrl || u.avatar,
            userType: u.userType,
            score: 0,
            reasons: []
          }))
        setSearchResults(transformedUsers)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [userPickerSearch, currentUserId])

  // Get users to display - search results if searching, otherwise suggested users
  const displayUsers = userPickerSearch && userPickerSearch.length >= 2 ? searchResults : suggestedUsers

  // Filter users based on already selected
  const filteredPickerUsers = displayUsers.filter(user => {
    // Only exclude if already in the current mode's list (can be both admin AND member)
    if (userPickerMode === 'admin' && adminInvites.find(a => a.id === user.id)) return false
    if (userPickerMode === 'member' && memberInvites.find(m => m.id === user.id)) return false
    return true
  })

  // Open user picker
  const openUserPicker = (mode) => {
    setUserPickerMode(mode)
    setUserPickerSearch('')
    setShowUserPicker(true)
  }

  // Add user from picker
  const handlePickerAddUser = (user) => {
    if (userPickerMode === 'admin') {
      setAdminInvites([...adminInvites, user])
    } else {
      setMemberInvites([...memberInvites, user])
    }
  }

  // Get reason badge text
  const getReasonBadge = (reasons) => {
    if (reasons.includes('mutual')) return 'Mutual'
    if (reasons.includes('favorite')) return 'Favorite'
    if (reasons.includes('messaged')) return 'Messaged'
    if (reasons.includes('follower')) return 'Follows you'
    if (reasons.includes('following')) return 'Following'
    return null
  }

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

  const handleRemoveAdmin = (userId) => {
    setAdminInvites(adminInvites.filter(a => a.id !== userId))
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
  const confirmCreateParty = async () => {
    setShowConfirmation(false)
    // Display name with "Party" suffix (strip if user already typed it, apply title case)
    const cleanName = formatPartyName(partyName)
    const cleanHandle = formatPartyName(partyHandle)
    const displayName = cleanName ? `${cleanName} Party` : `${cleanHandle} Party`

    // Use uploaded photo preview (data URL) or capture a frame from the video
    const avatarPhoto = partyPhotoPreview || captureVideoFrame()

    // Note: Invites are sent from App.jsx AFTER party and reel are created
    // This allows us to include the reelId in invites for action buttons to work

    const partyData = {
      name: displayName,
      handle: partyHandle,
      bio: partyBio,
      photo: avatarPhoto,
      color: partyColor,
      introVideo: recordedVideoBase64 || recordedVideoUrl, // Prefer base64 for persistence
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

  // Debounce refs for real-time validation
  const nameCheckTimeoutRef = useRef(null)
  const handleCheckTimeoutRef = useRef(null)

  // Check party name availability (debounced, called on every keystroke)
  const checkNameAvailability = useCallback(async (name) => {
    console.log('🔍 checkNameAvailability called with:', name)
    if (!name || name.length < 2) {
      console.log('🔍 Name too short, skipping check')
      setNameWarning('')
      setIsCheckingName(false)
      return
    }

    setIsCheckingName(true)
    try {
      // Format name the same way we'll submit it
      const formattedName = `${formatPartyName(name)} Party`
      console.log('🔍 Checking formatted name:', formattedName)
      const response = await partiesApi.checkName(formattedName, null)
      console.log('🔍 Name check raw response:', response)
      // API returns { success: true, data: { available, takenBy } }
      const result = response.data || response
      console.log('🔍 Name check result:', result)
      if (!result.available) {
        console.log('🚨 Name NOT available, takenBy:', result.takenBy)
        setNameWarning('Party name already taken')
      } else {
        console.log('✅ Name is available')
        setNameWarning('')
      }
    } catch (error) {
      console.error('❌ Error checking party name:', error)
      setNameWarning('')
    } finally {
      setIsCheckingName(false)
    }
  }, [])

  // Check party handle availability (debounced, called on every keystroke)
  const checkHandleAvailability = useCallback(async (handle) => {
    console.log('🔍 checkHandleAvailability called with:', handle)
    if (!handle || handle.length < 3) {
      console.log('🔍 Handle too short, skipping check')
      setHandleWarning('')
      setIsCheckingHandle(false)
      return
    }

    setIsCheckingHandle(true)
    try {
      console.log('🔍 Checking handle:', handle)
      const response = await partiesApi.checkName(null, handle)
      console.log('🔍 Handle check raw response:', response)
      // API returns { success: true, data: { available, takenBy } }
      const result = response.data || response
      console.log('🔍 Handle check result:', result)
      if (!result.available) {
        console.log('🚨 Handle NOT available, takenBy:', result.takenBy)
        setHandleWarning('Handle already taken')
      } else {
        console.log('✅ Handle is available')
        setHandleWarning('')
      }
    } catch (error) {
      console.error('❌ Error checking party handle:', error)
      setHandleWarning('')
    } finally {
      setIsCheckingHandle(false)
    }
  }, [])

  // Handle name change with debounced validation
  const handleNameChange = (e) => {
    const value = e.target.value
    console.log('📝 Name changed to:', value)
    setPartyName(value)

    // Clear previous timeout
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current)
    }

    // Debounce the API call (300ms)
    console.log('📝 Setting name check timeout...')
    nameCheckTimeoutRef.current = setTimeout(() => {
      console.log('📝 Name timeout fired, calling checkNameAvailability')
      checkNameAvailability(value.trim())
    }, 300)
  }

  // Handle handle change with debounced validation
  const handleHandleChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    console.log('📝 Handle changed to:', value)
    setPartyHandle(value)

    // Clear previous timeout
    if (handleCheckTimeoutRef.current) {
      clearTimeout(handleCheckTimeoutRef.current)
    }

    // Debounce the API call (300ms)
    console.log('📝 Setting handle check timeout...')
    handleCheckTimeoutRef.current = setTimeout(() => {
      console.log('📝 Handle timeout fired, calling checkHandleAvailability')
      checkHandleAvailability(value.trim())
    }, 300)
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current)
      if (handleCheckTimeoutRef.current) clearTimeout(handleCheckTimeoutRef.current)
    }
  }, [])

  const canCreate = partyHandle.trim().length >= 3 && !nameWarning && !handleWarning && !isCheckingName && !isCheckingHandle

  return (
    <div className="party-screen">
      {/* Header */}
      <button className="party-back-btn" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="party-content">
        {/* Video Preview - hidden when converting from groupchat */}
        {!isFromGroupChat && (
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
        )}

        {/* Header for groupchat conversion */}
        {isFromGroupChat && (
          <div className="party-groupchat-header">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h2>Create Party from Group</h2>
            <p>Turn your group chat into a party</p>
          </div>
        )}

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
            className={`party-handle-input ${handleWarning ? 'has-warning' : ''}`}
            placeholder="partyhandle"
            value={partyHandle}
            onChange={handleHandleChange}
            maxLength={20}
          />
          {isCheckingHandle && (
            <span className="party-input-checking">Checking...</span>
          )}
          {handleWarning && !isCheckingHandle && (
            <span className="party-input-warning">{handleWarning}</span>
          )}
        </div>

        {/* Party Name */}
        <div className="party-name-row">
          <input
            type="text"
            className={`party-name-input ${nameWarning ? 'has-warning' : ''}`}
            placeholder="Party Name"
            value={partyName}
            onChange={handleNameChange}
            maxLength={30}
          />
          <span className="party-name-suffix">Party</span>
          {isCheckingName && (
            <span className="party-input-checking">Checking...</span>
          )}
          {nameWarning && !isCheckingName && (
            <span className="party-input-warning">{nameWarning}</span>
          )}
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
          <button className="party-admin-search clickable" onClick={() => openUserPicker('admin')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <span className="party-search-placeholder">Search users...</span>
          </button>

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
          <button className="party-admin-search clickable" onClick={() => openUserPicker('member')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <span className="party-search-placeholder">Search users...</span>
          </button>

          {(isFromGroupChat && groupChatName || memberInvites.length > 0) && (
            <div className="party-admin-list">
              {isFromGroupChat && groupChatName && (
                <div className="party-admin-chip disabled">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>{groupChatName}</span>
                </div>
              )}
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

        {/* Post Settings - hidden when converting from groupchat */}
        {!isFromGroupChat && (
          <>
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
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="party-bottom-actions">
        {!isFromGroupChat && (
          <button className="party-drafts-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Drafts
          </button>
        )}
        <button
          className={`party-submit-btn ${isFromGroupChat ? 'full-width' : ''}`}
          onClick={handleCreateParty}
          disabled={!canCreate}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {isFromGroupChat ? (
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            ) : (
              <path d="M12 19V5M5 12l7-7 7 7"/>
            )}
          </svg>
          {isFromGroupChat ? 'Create Party' : 'Post'}
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
            {isFromGroupChat && (
              <div className="party-confirm-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Members will need to <strong>accept the invite and join</strong> to continue seeing messages and chat details.</span>
              </div>
            )}
            <div className="party-confirm-actions">
              <button className="party-confirm-cancel" onClick={() => setShowConfirmation(false)}>
                {isFromGroupChat ? 'Cancel' : 'Stay Independent'}
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

      {/* User Picker Modal */}
      {showUserPicker && createPortal(
        <div className="user-picker-overlay" onClick={() => setShowUserPicker(false)}>
          <div className="user-picker-modal" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="user-picker-handle" />

            {/* Header */}
            <div className="user-picker-header">
              <button className="user-picker-close" onClick={() => setShowUserPicker(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <h3 className="user-picker-title">
                {userPickerMode === 'admin' ? 'Invite Admins' : 'Invite Members'}
              </h3>
              <button
                className="user-picker-done"
                onClick={() => setShowUserPicker(false)}
              >
                Done
              </button>
            </div>

            {/* Search bar */}
            <div className="user-picker-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={userPickerSearchRef}
                type="text"
                placeholder="Search users..."
                value={userPickerSearch}
                onChange={(e) => setUserPickerSearch(e.target.value)}
              />
              {userPickerSearch && (
                <button className="user-picker-clear" onClick={() => setUserPickerSearch('')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Algorithm explanation */}
            <div className="user-picker-algo-hint">
              {userPickerSearch && userPickerSearch.length >= 2
                ? `Searching all users for "${userPickerSearch}"`
                : 'Search for any user or choose from suggestions below'
              }
            </div>

            {/* User list */}
            <div className="user-picker-list">
              {isLoadingUsers || isSearching ? (
                <div className="user-picker-loading">
                  <div className="user-picker-spinner" />
                  <span>{isSearching ? 'Searching...' : 'Loading suggestions...'}</span>
                </div>
              ) : filteredPickerUsers.length === 0 ? (
                <div className="user-picker-empty">
                  {userPickerSearch && userPickerSearch.length >= 2 ? (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>No users found for "{userPickerSearch}"</span>
                    </>
                  ) : userPickerSearch && userPickerSearch.length < 2 ? (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>Type at least 2 characters to search</span>
                    </>
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Search for any user to invite</span>
                    </>
                  )}
                </div>
              ) : (
                filteredPickerUsers.map(user => (
                  <button
                    key={user.id}
                    className="user-picker-row"
                    onClick={() => handlePickerAddUser(user)}
                  >
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                      alt={user.name || user.username}
                      className="user-picker-avatar"
                    />
                    <div className="user-picker-info">
                      <div className="user-picker-name-row">
                        <span className="user-picker-name">{user.name || user.username}</span>
                        {user.userType === 'CANDIDATE' && (
                          <span className="user-picker-candidate-badge">Candidate</span>
                        )}
                      </div>
                      <span className="user-picker-handle">@{user.username}</span>
                    </div>
                    {user.reasons && getReasonBadge(user.reasons) && (
                      <span className={`user-picker-reason ${user.reasons[0]}`}>
                        {getReasonBadge(user.reasons)}
                      </span>
                    )}
                    <span className="user-picker-add">+ Add</span>
                  </button>
                ))
              )}
            </div>

            {/* Selected users preview */}
            {((userPickerMode === 'admin' && adminInvites.length > 0) ||
              (userPickerMode === 'member' && memberInvites.length > 0)) && (
              <div className="user-picker-selected">
                <span className="user-picker-selected-label">
                  {userPickerMode === 'admin' ? 'Admins' : 'Members'} to invite:
                </span>
                <div className="user-picker-selected-list">
                  {(userPickerMode === 'admin' ? adminInvites : memberInvites).map(user => (
                    <div key={user.id} className="user-picker-selected-chip">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`} alt={user.username} />
                      <span>@{user.username}</span>
                      <button onClick={() => userPickerMode === 'admin' ? handleRemoveAdmin(user.id) : handleRemoveMember(user.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PartyCreationFlow
