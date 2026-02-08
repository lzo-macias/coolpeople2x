import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import VideoEditor from './VideoEditor'
import { usersApi, searchApi, favoritesApi } from '../services/api'
import '../styling/PostScreen.css'
import '../styling/PartyCreationFlow.css'
import '../styling/VideoEditor.css'

function PostScreen({ onClose, onPost, onDraftSaved, isRaceMode, isNominateMode, raceName, raceDeadline, recordedVideoUrl, recordedVideoBase64, isMirrored, showSelfieCam, taggedUser, getContactDisplayName, textOverlays, userParty, userRacesFollowing = [], userRacesCompeting = [], conversations = {}, isQuoteNomination, quotedReel, currentUserId, selfieSize, selfiePosition, showSelfieOverlay, trimStart = 0, trimEnd = null, selectedSound }) {
  const [title, setTitle] = useState('')
  const videoRef = useRef(null)
  const [showVideoEditor, setShowVideoEditor] = useState(false)
  const [localTrimStart, setLocalTrimStart] = useState(trimStart)
  const [localTrimEnd, setLocalTrimEnd] = useState(trimEnd)
  const [localSegments, setLocalSegments] = useState(null)
  const previewSegIdxRef = useRef(0)

  // Render text with styled mentions (matches EditClipScreen)
  const renderTextWithMentions = (text, mentions) => {
    if (!mentions || mentions.length === 0) return text
    const parts = []
    let remaining = text
    for (const mention of mentions) {
      const marker = `@${mention.username}`
      const idx = remaining.indexOf(marker)
      if (idx === -1) continue
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), type: 'plain' })
      parts.push({ text: marker, type: mention.type, username: mention.username })
      remaining = remaining.slice(idx + marker.length)
    }
    if (remaining) parts.push({ text: remaining, type: 'plain' })
    if (parts.length === 0) return text
    return parts.map((part, i) => {
      if (part.type === 'nominate') {
        return <span key={i} className="mention-nominate">{part.text}</span>
      } else if (part.type === 'tag') {
        return <span key={i} className="mention-tag">{part.text}</span>
      }
      return <span key={i}>{part.text}</span>
    })
  }

  // Seek to trimStart on mount and set up trim loop
  useEffect(() => {
    if (videoRef.current && recordedVideoUrl) {
      videoRef.current.currentTime = localTrimStart || 0
      videoRef.current.play().catch(() => {})
    }
    // Cleanup - pause when unmounting
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [])

  // Pause video when VideoEditor is open
  useEffect(() => {
    if (showVideoEditor) {
      if (videoRef.current) videoRef.current.pause()
    } else {
      // Resuming from VideoEditor — restart video from first segment
      if (videoRef.current && recordedVideoUrl) {
        previewSegIdxRef.current = 0
        if (localSegments && localSegments.length > 0) {
          videoRef.current.currentTime = localSegments[0].start
        }
        videoRef.current.play().catch(() => {})
      }
    }
  }, [showVideoEditor, recordedVideoUrl, localSegments])


  const [caption, setCaption] = useState('')
  const [selectedTarget, setSelectedTarget] = useState(isRaceMode ? raceName : null)
  const [selectedPostTo, setSelectedPostTo] = useState(['Your Feed']) // Array for multi-select
  const [selectedSendTo, setSelectedSendTo] = useState([])
  const [selectedSendToUsers, setSelectedSendToUsers] = useState([]) // Users/chats selected from picker
  const [showSendToPicker, setShowSendToPicker] = useState(false)
  const [sendToSearch, setSendToSearch] = useState('')
  const [sendToSearchResults, setSendToSearchResults] = useState([])
  const [sendToSuggestions, setSendToSuggestions] = useState([]) // Combined chats and users
  const [isSearchingSendTo, setIsSearchingSendTo] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [sendTogether, setSendTogether] = useState(false) // Send as group or separate
  const sendToSearchRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedSocials, setSelectedSocials] = useState([])
  const [wantToCompete, setWantToCompete] = useState(false) // Default to just following (not competing)

  // Scale selfie overlay from edit screen (440px wide) to post preview (180px wide)
  const previewScale = 180 / 440
  const scaledSelfie = selfieSize ? {
    w: selfieSize.w * previewScale,
    h: selfieSize.h * previewScale,
    x: (selfiePosition?.x || 16) * previewScale,
    y: (selfiePosition?.y || 80) * previewScale,
  } : null

  // Build target races from user's followed/competing races
  // If in race mode, use the raceName; otherwise show races user follows/competes in
  const buildTargetRaces = () => {
    if (isRaceMode && raceName) return [raceName]
    // Combine followed and competing races, remove duplicates by id
    const allRaces = [...userRacesFollowing, ...userRacesCompeting]
    // Handle both object format {id, title} and legacy string format
    const uniqueRaces = []
    const seenIds = new Set()
    for (const race of allRaces) {
      if (!race) continue
      // Handle object format
      if (typeof race === 'object' && race.id) {
        if (!seenIds.has(race.id)) {
          seenIds.add(race.id)
          uniqueRaces.push(race.title)
        }
      } else if (typeof race === 'string') {
        // Legacy string format - filter out UUIDs and "default"
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (race !== 'default' && !uuidPattern.test(race) && !seenIds.has(race)) {
          seenIds.add(race)
          uniqueRaces.push(race)
        }
      }
    }
    return uniqueRaces
  }
  const targetRaces = buildTargetRaces()

  // Build post to options - include user's party if they have one (and not Independent)
  const postToOptions = userParty && userParty.name !== 'Independent' ? ['Your Feed', userParty.name] : ['Your Feed']

  // Build send to options from active conversations (DMs/group chats user engages with most)
  const buildSendToOptions = () => {
    const options = []
    // Add party if user has one (and not Independent)
    if (userParty && userParty.name !== 'Independent') {
      options.push(userParty.name)
    }
    // Add most active conversations (get conversation names/titles)
    const conversationList = Object.values(conversations)
    if (conversationList.length > 0) {
      // Take up to 3 most recent/active conversations
      const activeConvos = conversationList
        .slice(0, 3)
        .map(conv => conv.name || conv.title || conv.participantName)
        .filter(Boolean)
      options.push(...activeConvos)
    }
    return options
  }
  const sendToOptions = buildSendToOptions()

  const locationOptions = ['Dumbo', 'Brooklyn', 'Manhattan', 'Queens']

  // Load suggested chats and users when send-to picker opens (same pattern as user-picker-modal)
  useEffect(() => {
    if (!showSendToPicker) return

    const fetchSuggestedUsers = async () => {
      setIsLoadingSuggestions(true)
      try {
        // Fetch ALL users AND relationship data in parallel (same as PartyCreationFlow)
        const [allUsersRes, followersRes, followingRes, favoritesRes] = await Promise.all([
          searchApi.search('', { type: 'users', limit: 100 }).catch(() => ({ users: [] })),
          usersApi.getFollowers(currentUserId || 'me').catch(() => ({ data: [] })),
          usersApi.getFollowing(currentUserId || 'me').catch(() => ({ data: [] })),
          favoritesApi.getFavorites().catch(() => ({ data: [] }))
        ])

        // Extract all users from search
        const allUsers = allUsersRes.data?.users || allUsersRes.users || []

        // Extract relationship data
        const followers = followersRes.data?.followers || followersRes.followers || followersRes.data || []
        const following = followingRes.data?.following || followingRes.following || followingRes.data || []
        const favorites = Array.isArray(favoritesRes.data) ? favoritesRes.data : (favoritesRes.favorites || [])

        // Create sets for quick lookup
        const followerIds = new Set(followers.map(f => f.id))
        const followingIds = new Set(following.map(f => f.id))
        const favoriteIds = new Set(favorites.map(f => f.favoritedUser?.id || f.id))

        // Get conversation partner IDs
        const conversationUserIds = new Set(
          Object.values(conversations || {})
            .filter(c => c.participantId || c.userId)
            .map(c => c.participantId || c.userId)
        )

        // Build conversations list from props
        const conversationsList = Object.values(conversations || {}).map(conv => ({
          id: conv.id || conv.recipientId,
          name: conv.name || conv.title || conv.participantName,
          username: conv.participantUsername,
          avatar: conv.avatar || conv.participantAvatar,
          type: conv.isGroup ? 'group' : 'dm',
          isChat: true
        })).filter(c => c.name)

        // Add party chat if user has a party
        const partyChats = []
        if (userParty && userParty.name && userParty.name !== 'Independent') {
          partyChats.push({
            id: `party-${userParty.id || userParty.name}`,
            name: userParty.name,
            avatar: userParty.avatar || userParty.logo,
            type: 'party',
            isChat: true
          })
        }

        // Score all users based on relationship (same algorithm as PartyCreationFlow)
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
              reasons,
              isChat: false
            }
          })
          .sort((a, b) => b.score - a.score)

        // Combine all: party chats first, then conversations, then scored users
        const allSuggestions = [
          ...partyChats,
          ...conversationsList.slice(0, 5),
          ...scoredUsers
        ]

        setSendToSuggestions(allSuggestions)
      } catch (err) {
        console.error('Failed to load suggestions:', err)
        setSendToSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestedUsers()
    // Focus search input
    setTimeout(() => sendToSearchRef.current?.focus(), 100)
  }, [showSendToPicker, currentUserId, conversations, userParty])

  // Search all users when search query changes (same pattern as PartyCreationFlow)
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // If no search query, clear search results
    if (!sendToSearch || sendToSearch.length < 2) {
      setSendToSearchResults([])
      setIsSearchingSendTo(false)
      return
    }

    // Debounce search
    setIsSearchingSendTo(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchApi.search(sendToSearch, { type: 'users' })
        const users = response.data?.users || response.users || []
        // Transform to match our format
        const transformedUsers = users
          .filter(u => u.id !== currentUserId)
          .map(u => ({
            id: u.id,
            username: u.username,
            name: u.displayName || u.name,
            avatar: u.avatarUrl || u.avatar,
            userType: u.userType,
            score: 0,
            reasons: [],
            isChat: false
          }))
        setSendToSearchResults(transformedUsers)
      } catch (error) {
        console.error('Search error:', error)
        setSendToSearchResults([])
      } finally {
        setIsSearchingSendTo(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [sendToSearch, currentUserId])

  // Get reason badge text (same as PartyCreationFlow)
  const getReasonBadge = (reasons) => {
    if (!reasons || reasons.length === 0) return null
    if (reasons.includes('mutual')) return 'Mutual'
    if (reasons.includes('favorite')) return 'Favorite'
    if (reasons.includes('messaged')) return 'Messaged'
    if (reasons.includes('follower')) return 'Follows you'
    if (reasons.includes('following')) return 'Following'
    return null
  }

  const togglePostTo = (option) => {
    setSelectedPostTo(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    )
  }

  const toggleSendTo = (option) => {
    setSelectedSendTo(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    )
  }

  const toggleSendToUser = (user) => {
    setSelectedSendToUsers(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) {
        return prev.filter(u => u.id !== user.id)
      }
      return [...prev, user]
    })
  }

  const isUserSelectedForSend = (userId) => {
    return selectedSendToUsers.some(u => u.id === userId)
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

  const handlePost = () => {
    onPost?.({ title, caption, postTo: selectedPostTo, sendTo: selectedSendTo, sendToUsers: selectedSendToUsers, sendTogether, location: selectedLocation, shareTo: selectedSocials, targetRace: selectedTarget, isMirrored, wantToCompete: isRaceMode ? wantToCompete : undefined, selfieSize, selfiePosition, showSelfieOverlay, segments: localSegments })
  }

  const handleSaveDraft = () => {
    try {
      let existingDrafts = JSON.parse(localStorage.getItem('coolpeople-drafts') || '[]')

      // Determine mode
      let mode = 'post'
      if (isRaceMode) mode = 'race'
      else if (isNominateMode) mode = 'nominate'

      // Use base64 for persistent storage, fallback to URL
      const persistentVideoUrl = recordedVideoBase64 || recordedVideoUrl

      const newDraft = {
        id: `draft-${Date.now()}`,
        type: 'video',
        videoUrl: persistentVideoUrl,
        selfieVideoUrl: persistentVideoUrl,
        thumbnail: quotedReel?.thumbnail || null, // Don't duplicate video as thumbnail
        isMirrored: isMirrored || false,
        timestamp: Date.now(),
        mode,
        // Race info
        raceName: raceName || null,
        raceDeadline: raceDeadline || null,
        // Nominate info
        taggedUser: taggedUser || null,
        isNominateMode: isNominateMode || false,
        // Quote nomination info
        isQuoteNomination: isQuoteNomination || false,
        quotedReel: quotedReel || null,
        hasSelfieOverlay: (isQuoteNomination || isNominateMode) && showSelfieOverlay,
        selfieSize: selfieSize || { w: 120, h: 160 },
        selfiePosition: selfiePosition || { x: 16, y: 80 },
        showSelfieOverlay: (isQuoteNomination || isNominateMode) && showSelfieOverlay,
        // Text overlays
        textOverlays: textOverlays ? [...textOverlays] : [],
        // Post details
        title: title || '',
        caption: caption || '',
        postTo: selectedPostTo,
        sendTo: selectedSendTo,
        location: selectedLocation,
        shareTo: selectedSocials,
        targetRace: selectedTarget
      }

      // Try to save, if quota exceeded, remove oldest drafts and retry
      const saveDraft = (draftsToSave) => {
        try {
          localStorage.setItem('coolpeople-drafts', JSON.stringify(draftsToSave))
          return true
        } catch (e) {
          if (e.name === 'QuotaExceededError' && draftsToSave.length > 1) {
            // Remove oldest draft and retry
            console.log('Storage full, removing oldest draft...')
            draftsToSave.pop()
            return saveDraft(draftsToSave)
          }
          throw e
        }
      }

      const draftsToSave = [newDraft, ...existingDrafts]
      saveDraft(draftsToSave)
      console.log('Draft saved from PostScreen')

      // Close and reset to camera
      onDraftSaved?.()
    } catch (e) {
      console.error('Failed to save draft:', e)
      alert('Storage is full. Please delete some drafts and try again.')
    }
  }

  return (
    <div className="post-screen">
      {/* Header */}
      <button className="post-back-btn" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="post-content">
        {/* Video Preview */}
        <div className="post-video-preview">
          {isQuoteNomination && quotedReel ? (
            /* Quote Nomination Mode: Quoted reel as main + selfie overlay */
            <>
              {quotedReel.videoUrl ? (
                <video
                  ref={videoRef}
                  src={quotedReel.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : quotedReel.thumbnail ? (
                <img src={quotedReel.thumbnail} alt="Quoted reel" />
              ) : null}
              {recordedVideoUrl && showSelfieOverlay && (
                <div
                  className="post-selfie-cam"
                  style={scaledSelfie ? {
                    width: scaledSelfie.w,
                    height: scaledSelfie.h,
                    left: scaledSelfie.x,
                    top: scaledSelfie.y,
                  } : undefined}
                >
                  <video
                    src={recordedVideoUrl}
                    className={isMirrored ? 'mirrored' : ''}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </div>
              )}
            </>
          ) : recordedVideoUrl ? (
            <video
              ref={videoRef}
              src={recordedVideoUrl}
              className={isMirrored ? 'mirrored' : ''}
              autoPlay
              loop
              muted
              playsInline
              onTimeUpdate={() => {
                const vid = videoRef.current
                if (!vid) return
                if (localSegments && localSegments.length > 0) {
                  const idx = previewSegIdxRef.current
                  const seg = localSegments[idx]
                  if (seg && vid.currentTime >= seg.end - 0.05) {
                    if (idx < localSegments.length - 1) {
                      previewSegIdxRef.current = idx + 1
                      vid.currentTime = localSegments[idx + 1].start
                    } else {
                      previewSegIdxRef.current = 0
                      vid.currentTime = localSegments[0].start
                    }
                  }
                } else if (localTrimEnd !== null && vid.currentTime >= localTrimEnd) {
                  vid.currentTime = localTrimStart || 0
                }
              }}
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=300&h=400&fit=crop"
              alt="Video preview"
            />
          )}

          {/* Selfie Cam inside preview - for nominate mode (non-quote) */}
          {isNominateMode && !isQuoteNomination && showSelfieCam && showSelfieOverlay && recordedVideoUrl && (
            <div
              className="post-selfie-cam"
              style={scaledSelfie ? {
                width: scaledSelfie.w,
                height: scaledSelfie.h,
                left: scaledSelfie.x,
                top: scaledSelfie.y,
              } : undefined}
            >
              <video
                src={recordedVideoUrl}
                className={isMirrored ? 'mirrored' : ''}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          )}

          {/* Text Overlays inside preview (includes converted tags) */}
          {textOverlays && textOverlays.map((textItem, idx) => (
            <div
              key={`post-text-${textItem.id}-${idx}`}
              className="post-text-overlay"
              style={{
                left: `${(textItem.x / 400) * 100}%`,
                top: `${(textItem.y / 700) * 100}%`
              }}
            >
              <span className="post-text-content">{renderTextWithMentions(textItem.text, textItem.mentions)}</span>
            </div>
          ))}

          {/* Race Pill inside preview */}
          {isRaceMode && raceName && (
            <div className="post-race-pill">
              <span className="post-race-dot"></span>
              <span className="post-race-name">{raceName}</span>
            </div>
          )}

          <button className="post-edit-cover-btn">Edit Cover</button>
          <button className="post-edit-video-btn" onClick={() => setShowVideoEditor(true)}>Edit Video</button>
        </div>


        {/* Title & Caption */}
        <div className="post-text-inputs">
          <input
            type="text"
            className="post-title-input"
            placeholder="Add a Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="post-caption-input"
            placeholder="write a caption long captions get 3x more engagement"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        {/* Mention & Hashtag */}
        <div className="post-mention-row">
          <button className="post-mention-btn">@</button>
          <button className="post-hashtag-btn">#</button>
        </div>

        {/* Target Race - only show if user follows/competes in races */}
        {targetRaces.length > 0 && (
          <div className="post-option-row stacked">
            <span className="post-option-label">Target</span>
            <div className="post-option-tags">
              {targetRaces.map(race => (
                <button
                  key={race}
                  className={`post-tag target ${selectedTarget === race ? 'active' : ''}`}
                  onClick={() => !isRaceMode && setSelectedTarget(selectedTarget === race ? null : race)}
                >
                  {selectedTarget === race && <span className="post-tag-dot"></span>}
                  {race}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compete Toggle - only show in race mode */}
        {isRaceMode && (
          <div className="post-option-row compete-row">
            <span className="post-option-label">Do you want to compete in {raceName} race?</span>
            <button
              className={`post-compete-toggle ${wantToCompete ? 'active' : ''}`}
              onClick={() => setWantToCompete(!wantToCompete)}
            >
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
            </button>
          </div>
        )}

        {/* Post To */}
        <div className="post-option-row stacked">
          <span className="post-option-label">Post To</span>
          <div className="post-option-tags">
            {postToOptions.map(option => (
              <button
                key={option}
                className={`post-tag ${selectedPostTo.includes(option) ? 'active' : ''}`}
                onClick={() => togglePostTo(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Send To */}
        <div className="post-option-row">
          <span className="post-option-label">Send To</span>
          <div className="post-option-tags">
            {sendToOptions.map(option => (
              <button
                key={option}
                className={`post-tag ${selectedSendTo.includes(option) ? 'active' : ''}`}
                onClick={() => toggleSendTo(option)}
              >
                {option}
              </button>
            ))}
            {selectedSendToUsers.map(item => (
              <button
                key={item.id}
                className={`post-tag active user-tag ${item.isChat ? 'chat-tag' : ''}`}
                onClick={() => toggleSendToUser(item)}
              >
                <img src={item.avatar || `https://ui-avatars.com/api/?name=${item.name || item.username}&background=random`} alt="" className="tag-avatar" />
                {item.name || item.username}
                <span className="tag-remove">×</span>
              </button>
            ))}
            <button className="send-to-search-btn" onClick={() => setShowSendToPicker(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="post-option-row">
          <span className="post-option-label">Location</span>
          {/* <svg className="post-location-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg> */}
          <div className="post-location-tags">
            {locationOptions.map(option => (
              <button
                key={option}
                className={`post-location-tag ${selectedLocation === option ? 'active' : ''}`}
                onClick={() => setSelectedLocation(selectedLocation === option ? null : option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Share To */}
        <div className="post-option-row">
          <span className="post-option-label">Share to</span>
          <div className="post-share-icons">
            <button className="post-share-btn instagram" onClick={() => toggleSocial('instagram')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {getSocialOrder('instagram') && <span className="share-badge">{getSocialOrder('instagram')}</span>}
            </button>
            <button className="post-share-btn facebook" onClick={() => toggleSocial('facebook')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {getSocialOrder('facebook') && <span className="share-badge">{getSocialOrder('facebook')}</span>}
            </button>
            <button className="post-share-btn whatsapp" onClick={() => toggleSocial('whatsapp')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {getSocialOrder('whatsapp') && <span className="share-badge">{getSocialOrder('whatsapp')}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="post-bottom-actions">
        <button className="post-drafts-btn" onClick={handleSaveDraft}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          Drafts
        </button>
        <button className="post-submit-btn" onClick={handlePost}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Post
        </button>
      </div>

      {/* Send To Picker Modal */}
      {showSendToPicker && createPortal(
        <div className="user-picker-overlay" onClick={() => setShowSendToPicker(false)}>
          <div className="user-picker-modal send-to-modal" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="user-picker-handle" />

            {/* Header */}
            <div className="user-picker-header">
              <button className="user-picker-close" onClick={() => setShowSendToPicker(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <h3 className="user-picker-title">Send To</h3>
              <button
                className="user-picker-done"
                onClick={() => setShowSendToPicker(false)}
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
                ref={sendToSearchRef}
                type="text"
                placeholder="Search chats & users..."
                value={sendToSearch}
                onChange={(e) => setSendToSearch(e.target.value)}
              />
              {sendToSearch && (
                <button className="user-picker-clear" onClick={() => setSendToSearch('')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" />
                  </svg>
                </button>
              )}
            </div>

            {/* List */}
            <div className="user-picker-list">
              {isLoadingSuggestions || isSearchingSendTo ? (
                <div className="user-picker-loading">
                  <div className="user-picker-spinner" />
                  <span>{isSearchingSendTo ? 'Searching...' : 'Loading...'}</span>
                </div>
              ) : (() => {
                const items = sendToSearch && sendToSearch.length >= 2
                  ? sendToSearchResults
                  : sendToSuggestions

                if (items.length === 0) {
                  return (
                    <div className="user-picker-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>
                        {sendToSearch && sendToSearch.length >= 2
                          ? `No results for "${sendToSearch}"`
                          : 'Search for users or chats'
                        }
                      </span>
                    </div>
                  )
                }

                return items.map(item => (
                  <button
                    key={item.id}
                    className={`user-picker-row ${isUserSelectedForSend(item.id) ? 'selected' : ''}`}
                    onClick={() => toggleSendToUser(item)}
                  >
                    <div className="send-to-avatar-wrap">
                      <img
                        src={item.avatar || `https://ui-avatars.com/api/?name=${item.name || item.username}&background=random`}
                        alt={item.name || item.username}
                        className="user-picker-avatar"
                      />
                      {item.isChat && (
                        <div className={`send-to-type-badge ${item.type}`}>
                          {item.type === 'party' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                          ) : item.type === 'group' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="user-picker-info">
                      <div className="user-picker-name-row">
                        <span className="user-picker-name">{item.name || item.username}</span>
                        {item.isChat && (
                          <span className="send-to-type-label">
                            {item.type === 'party' ? 'Party' : item.type === 'group' ? 'Group' : 'Chat'}
                          </span>
                        )}
                        {item.userType === 'CANDIDATE' && (
                          <span className="user-picker-candidate-badge">Candidate</span>
                        )}
                      </div>
                      {!item.isChat && item.username && (
                        <span className="user-picker-handle">@{item.username}</span>
                      )}
                      {!item.isChat && item.reasons && getReasonBadge(item.reasons) && (
                        <span className={`user-picker-reason ${item.reasons[0]}`}>
                          {getReasonBadge(item.reasons)}
                        </span>
                      )}
                    </div>
                    {isUserSelectedForSend(item.id) && (
                      <div className="user-picker-check">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))
              })()}
            </div>

            {/* Send Together Toggle */}
            {selectedSendToUsers.length > 1 && (
              <div className="send-to-toggle-row">
                <button
                  className={`send-to-toggle-btn ${!sendTogether ? 'active' : ''}`}
                  onClick={() => setSendTogether(false)}
                >
                  Send Separate
                </button>
                <button
                  className={`send-to-toggle-btn ${sendTogether ? 'active' : ''}`}
                  onClick={() => setSendTogether(true)}
                >
                  Send Together
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Video Editor */}
      {showVideoEditor && (
        <VideoEditor
          videoUrl={recordedVideoUrl}
          isMirrored={isMirrored}
          selectedSound={selectedSound}
          initialTrimStart={localTrimStart}
          initialTrimEnd={localTrimEnd}
          showSelfieOverlay={showSelfieOverlay}
          selfieSize={selfieSize}
          selfiePosition={selfiePosition}
          onDone={({ trimStart: ts, trimEnd: te, segments: segs }) => {
            setLocalTrimStart(ts)
            setLocalTrimEnd(te)
            if (segs) setLocalSegments(segs)
            setShowVideoEditor(false)
            if (videoRef.current) {
              // Start from the first segment's start time
              const startTime = segs && segs.length > 0 ? segs[0].start : ts
              videoRef.current.currentTime = startTime
              videoRef.current.play().catch(() => {})
            }
          }}
          onClose={() => setShowVideoEditor(false)}
        />
      )}
    </div>
  )
}

export default PostScreen
