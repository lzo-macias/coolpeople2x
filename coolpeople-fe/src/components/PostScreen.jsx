import { useState, useRef, useEffect } from 'react'
import '../styling/PostScreen.css'

function PostScreen({ onClose, onPost, onDraftSaved, isRaceMode, isNominateMode, raceName, raceDeadline, recordedVideoUrl, recordedVideoBase64, isMirrored, showSelfieCam, taggedUser, getContactDisplayName, textOverlays, userParty, userRacesFollowing = [], userRacesCompeting = [], conversations = {}, isQuoteNomination, quotedReel }) {
  const [title, setTitle] = useState('')
  const videoRef = useRef(null)

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
  const [caption, setCaption] = useState('')
  const [selectedTarget, setSelectedTarget] = useState(isRaceMode ? raceName : null)
  const [selectedPostTo, setSelectedPostTo] = useState(['Your Feed']) // Array for multi-select
  const [selectedSendTo, setSelectedSendTo] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedSocials, setSelectedSocials] = useState([])

  // Build target races from user's followed/competing races
  // If in race mode, use the raceName; otherwise show races user follows/competes in
  const buildTargetRaces = () => {
    if (isRaceMode && raceName) return [raceName]
    // Combine followed and competing races, remove duplicates
    const allRaces = [...new Set([...userRacesFollowing, ...userRacesCompeting])]
    // Filter out UUIDs (race IDs), "default", and empty values - only keep actual race names
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return allRaces.filter(race =>
      race &&
      race !== 'default' &&
      !uuidPattern.test(race)
    )
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
    onPost?.({ title, caption, postTo: selectedPostTo, sendTo: selectedSendTo, location: selectedLocation, shareTo: selectedSocials, targetRace: selectedTarget, isMirrored })
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
        hasSelfieOverlay: isQuoteNomination || isNominateMode,
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
              {recordedVideoUrl && (
                <div className="post-selfie-cam">
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
              playsInline
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=300&h=400&fit=crop"
              alt="Video preview"
            />
          )}

          {/* Selfie Cam inside preview - for nominate mode (non-quote) */}
          {isNominateMode && !isQuoteNomination && showSelfieCam && recordedVideoUrl && (
            <div className="post-selfie-cam">
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

          {/* Tagged User inside preview */}
          {isNominateMode && taggedUser && (
            <div className="post-tag-display">
              <span className="post-tag-at">@</span>
              <span className="post-tag-name">
                {taggedUser.username || (getContactDisplayName ? getContactDisplayName(taggedUser) : taggedUser.phone)}
              </span>
            </div>
          )}

          {/* Text Overlays inside preview */}
          {textOverlays && textOverlays.map(textItem => (
            <div
              key={textItem.id}
              className="post-text-overlay"
              style={{
                left: `${(textItem.x / 400) * 100}%`,
                top: `${(textItem.y / 700) * 100}%`
              }}
            >
              <span className="post-text-content">{textItem.text}</span>
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
          <button className="post-edit-video-btn">Edit Video</button>
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

        {/* Send To - only show if user has party or active conversations */}
        {sendToOptions.length > 0 && (
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
            </div>
          </div>
        )}

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
    </div>
  )
}

export default PostScreen
