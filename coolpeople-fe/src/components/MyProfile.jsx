import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import EditBio from './EditBio'
import SinglePostView from './SinglePostView'
import CandidateProfile from './CandidateProfile'
import { getPartyColor } from '../data/mockData'
import '../styling/MyProfile.css'

// Activity type colors and icons (same as CandidateProfile)
const activityConfig = {
  like: { color: '#FF4D6A', icon: '♥' },
  nominate: { color: '#00F2EA', icon: '★' },
  repost: { color: '#4CAF50', icon: '↻' },
  comment: { color: '#FFB800', icon: '💬' },
  endorsement: { color: '#9B59B6', icon: '✓' },
  ballot: { color: '#FF9500', icon: '☐' },
  favorite: { color: '#FFD700', icon: '★' },
}

// Activity Video Item component with IntersectionObserver for auto-play
function ActivityVideoItem({ activity, activityConfig, getPartyColor }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const config = activityConfig[activity.type] || activityConfig.like
  const video = activity.video
  const videoPartyColor = getPartyColor(video?.user?.party || 'Independent')

  // Check if we have a video URL to play - prefer video over thumbnail
  const hasVideoUrl = !!video?.videoUrl

  // IntersectionObserver for auto-play when 50% visible
  useEffect(() => {
    if (!hasVideoUrl || !containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (videoRef.current) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            videoRef.current.play().catch(() => {})
          } else {
            videoRef.current.pause()
          }
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [hasVideoUrl])

  return (
    <div className="activity-item" ref={containerRef}>
      {/* Action indicator at top - full width */}
      <div className="activity-action-badge">
        <span className="activity-action-icon" style={{ color: config.color }}>{config.icon}</span>
        <span className="activity-action-text">
          {activity.type === 'repost' || activity.type === 'post' ? 'post by' : activity.action}
        </span>
        <span className="activity-action-user">{video?.user?.username || 'unknown'}</span>
        <span className="activity-timestamp">{activity.timestamp}</span>
      </div>

      {/* Video card */}
      <div className="activity-video-card">
        {/* Video container */}
        <div className="activity-video-container">
          {hasVideoUrl ? (
            <video
              ref={videoRef}
              src={video.videoUrl}
              className={`activity-video-thumbnail ${video?.isMirrored ? 'mirrored' : ''}`}
              loop
              muted
              playsInline
            />
          ) : video?.thumbnail ? (
            <img
              src={video.thumbnail}
              alt=""
              className="activity-video-thumbnail"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop'
              }}
            />
          ) : (
            <div className="activity-video-thumbnail activity-video-placeholder" />
          )}

          {/* Overlay content */}
          <div className="activity-video-overlay">
            <div className="activity-info">
              {video?.race && (
                <div className="activity-race-pill">
                  <span className="activity-race-dot"></span>
                  {video.race}
                </div>
              )}
              <div className="activity-user-row">
                <img
                  src={video?.user?.avatar}
                  alt={video?.user?.username}
                  className="activity-user-avatar"
                  style={{ borderColor: videoPartyColor }}
                />
                <div className="activity-user-details">
                  <span className="activity-party-tag">{video?.user?.party || 'Independent'}</span>
                  <span className="activity-username">@{video?.user?.username}</span>
                </div>
              </div>
              <p className="activity-caption">{video?.caption}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Default profile data for new users (stats start at 0)
const defaultProfileData = {
  party: null, // Independent - no party affiliation
  hasOptedIn: false,
  following: '0',
  followers: '0',
  races: '0',
  ranking: '.3%',
}

// Tier configuration for CP points
const CP_TIERS = {
  bronze: { name: 'Bronze', min: 0, max: 999, color: '#CD7F32', icon: '/icons/tiers/dark/bronze.svg' },
  silver: { name: 'Silver', min: 1000, max: 2499, color: '#C0C0C0', icon: '/icons/tiers/dark/silver.svg' },
  gold: { name: 'Gold', min: 2500, max: 4999, color: '#FFD700', icon: '/icons/tiers/dark/gold.svg' },
  diamond: { name: 'Diamond', min: 5000, max: 9999, color: '#B9F2FF', icon: '/icons/tiers/dark/diamond.svg' },
  challenger: { name: 'Challenger', min: 10000, max: 24999, color: '#FF6B6B', icon: '/icons/tiers/dark/challenger.svg' },
  master: { name: 'Master', min: 25000, max: Infinity, color: '#9B59B6', icon: '/icons/tiers/dark/master.svg' },
}

// Calculate starter points based on engagement (50-200 range)
const calculateStarterPoints = (posts) => {
  // Base points between 50-100
  const basePoints = Math.floor(Math.random() * 50) + 50
  // Add small bonus for number of posts (up to 100 more)
  const postBonus = Math.min(posts.length * 10, 100)
  return basePoints + postBonus
}

const BIO_MAX_LENGTH = 150 // ~3 lines max

function MyProfile({ onPartyClick, onOptIn, onOptOut, userParty, userPosts = [], hasOptedIn = false, onOpenComments, userActivity = [], onEditIcebreakers, currentUser, onAvatarChange, onBioChange }) {
  // Get user data from currentUser prop, fallback to defaults
  const profileData = {
    username: currentUser?.username || 'User',
    avatar: currentUser?.avatar || null, // null means no custom avatar set
    ...defaultProfileData,
    // Override with currentUser values if available
    following: currentUser?.following || defaultProfileData.following,
    followers: currentUser?.followers || defaultProfileData.followers,
    races: currentUser?.racesFollowing?.length?.toString() || defaultProfileData.races,
  }
  const [activeTab, setActiveTab] = useState('posts')
  const [showEditBio, setShowEditBio] = useState(false)
  const [showBioEdit, setShowBioEdit] = useState(false)
  const [bioText, setBioText] = useState(currentUser?.bio || '')
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [starterPoints] = useState(() => calculateStarterPoints(userPosts))
  const [showShareModal, setShowShareModal] = useState(false)
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [customAvatar, setCustomAvatar] = useState(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImage, setCropImage] = useState(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const avatarInputRef = useRef(null)
  const cropCanvasRef = useRef(null)
  const cropImageRef = useRef(null)

  // Sync bioText with currentUser.bio when it changes externally (e.g., from parent state)
  useEffect(() => {
    if (currentUser?.bio !== undefined) {
      setBioText(currentUser.bio)
    }
  }, [currentUser?.bio])

  // Handle avatar file selection
  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Use URL.createObjectURL for immediate display
      const imageUrl = URL.createObjectURL(file)
      setCropImage(imageUrl)
      setCropZoom(1)
      setCropPosition({ x: 0, y: 0 })
      setShowCropModal(true)
    }
  }

  // Handle crop drag start
  const handleCropDragStart = (e) => {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragStart({ x: clientX - cropPosition.x, y: clientY - cropPosition.y })
  }

  // Handle crop drag move
  const handleCropDragMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setCropPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    })
  }

  // Handle crop drag end
  const handleCropDragEnd = () => {
    setIsDragging(false)
  }

  // Handle zoom change
  const handleZoomChange = (e) => {
    setCropZoom(parseFloat(e.target.value))
  }

  // Cancel crop
  const handleCropCancel = () => {
    if (cropImage) {
      URL.revokeObjectURL(cropImage)
    }
    setShowCropModal(false)
    setCropImage(null)
    setCropZoom(1)
    setCropPosition({ x: 0, y: 0 })
  }

  // Apply crop and save avatar
  const handleCropApply = () => {
    const img = cropImageRef.current
    if (!img) return

    const outputSize = 200
    const cropCircleSize = 240

    // Calculate the base displayed size (before zoom) - matches CSS max-height: 400px
    let baseDisplayWidth, baseDisplayHeight
    const maxHeight = 400
    if (img.naturalHeight > maxHeight) {
      baseDisplayHeight = maxHeight
      baseDisplayWidth = img.naturalWidth * (maxHeight / img.naturalHeight)
    } else {
      baseDisplayWidth = img.naturalWidth
      baseDisplayHeight = img.naturalHeight
    }

    // Apply zoom to get final displayed size
    const displayedWidth = baseDisplayWidth * cropZoom
    const displayedHeight = baseDisplayHeight * cropZoom

    // Calculate ratio between original image and displayed size
    const ratioX = img.naturalWidth / displayedWidth
    const ratioY = img.naturalHeight / displayedHeight

    // The crop circle is centered in the crop area
    // The image is centered, then offset by cropPosition
    // Find where crop circle top-left is relative to displayed image top-left
    const cropLeftInDisplay = (displayedWidth / 2) - cropPosition.x - (cropCircleSize / 2)
    const cropTopInDisplay = (displayedHeight / 2) - cropPosition.y - (cropCircleSize / 2)

    // Convert to original image coordinates
    const sourceX = Math.max(0, cropLeftInDisplay * ratioX)
    const sourceY = Math.max(0, cropTopInDisplay * ratioY)
    const sourceWidth = cropCircleSize * ratioX
    const sourceHeight = cropCircleSize * ratioY

    // Create canvas and draw
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputSize, outputSize)

    // Circular clip
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Draw the cropped portion
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, outputSize, outputSize
    )

    // Get the cropped image as data URL
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCustomAvatar(croppedImageUrl)
    onAvatarChange?.(croppedImageUrl)

    // Clean up object URL
    if (cropImage) {
      URL.revokeObjectURL(cropImage)
    }
    setShowCropModal(false)
    setCropImage(null)
  }

  // Determine which avatar to show
  const displayAvatar = customAvatar || profileData.avatar

  // Use user's created party if available, otherwise default to Independent
  const currentParty = userParty ? userParty.name : (profileData.party || 'Independent')
  const partyColor = userParty ? userParty.color : '#808080' // Independent is gray

  // If user has opted in, render as CandidateProfile with starter data
  if (hasOptedIn) {
    // Use persisted races or default to CP race
    const competingRaces = currentUser?.racesCompeting?.length > 0 ? currentUser.racesCompeting : ['CP']

    const starterCandidate = {
      id: 'my-profile',
      username: profileData.username,
      avatar: displayAvatar,
      party: null, // Still Independent
      bio: currentUser?.bio || bioText, // Use persisted bio from currentUser, fallback to local state
      nominations: '0',
      following: currentUser?.following || profileData.following,
      followers: currentUser?.followers || profileData.followers,
      races: competingRaces, // Races user is competing in
      ranking: profileData.ranking,
      cpPoints: starterPoints,
      change: `+${(Math.random() * 10).toFixed(2)}`,
      sparklineData: Array(20).fill(0).map((_, i) => starterPoints + Math.floor(Math.random() * 20) - 10),
      filteredSparklineData: Array(20).fill(0).map((_, i) => starterPoints + Math.floor(Math.random() * 15) - 5),
      postImages: userPosts, // Use actual user posts, not mock data
      isFollowing: false,
      isFavorited: false,
    }

    return (
      <CandidateProfile
        candidate={starterCandidate}
        onPartyClick={onPartyClick}
        onOpenComments={onOpenComments}
        userActivity={userActivity}
        isOwnProfile={true}
        isStarter={true}
        onEditIcebreakers={onEditIcebreakers}
        onOptOut={onOptOut}
        onAvatarChange={onAvatarChange}
        onBioChange={onBioChange}
      />
    )
  }

  // Only show actual user posts (no mock data for new accounts)
  const allPosts = userPosts

  // Handle post click to open SinglePostView
  const handlePostClick = (index) => {
    setSelectedPostIndex(index)
    setShowSinglePost(true)
  }

  const tabs = [
    { name: 'Posts', id: 'posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
    { name: 'Tags', id: 'tags', icon: '/icons/profile/userprofile/tags-icons.svg' },
    { name: 'Details', id: 'details', icon: '/icons/profile/userprofile/details-icon.svg' },
  ]

  return (
    <div className="my-profile">
      {/* Header */}
      <div className="my-profile-header">
        <div className="my-profile-top">
          {/* Left - Avatar and Info */}
          <div className="my-profile-left">
            <input
              type="file"
              id="avatar-file-input"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <label
              htmlFor="avatar-file-input"
              className={`my-profile-avatar-ring ${!displayAvatar ? 'placeholder' : ''}`}
              style={{ borderColor: partyColor, cursor: 'pointer' }}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={profileData.username}
                  className="my-profile-avatar"
                />
              ) : (
                <div className="my-profile-avatar-placeholder">
                  <span>add a profile photo</span>
                </div>
              )}
            </label>
            <div className="my-profile-info">
              <h2 className="my-profile-username">{profileData.username}</h2>
              <button
                className="my-profile-party"
                onClick={() => userParty && onPartyClick?.(userParty.handle)}
                style={{ cursor: userParty ? 'pointer' : 'default' }}
              >
                {currentParty}
              </button>
              {!hasOptedIn && (
                <button className="my-profile-optin-btn" onClick={onOptIn}>
                  opt in
                </button>
              )}
              {hasOptedIn && (
                <div className="my-profile-tier-badge">
                  <img src={CP_TIERS.bronze.icon} alt={CP_TIERS.bronze.name} className="tier-icon" />
                  <span className="tier-name">{CP_TIERS.bronze.name}</span>
                  <span className="tier-points">{starterPoints} CP</span>
                </div>
              )}
            </div>
          </div>

          {/* Right - Stats Grid */}
          <div className="my-profile-right">
            <div className="my-profile-stats-grid">
              <div className="stat-item">
                <span className="stat-number">{profileData.following}</span>
                <span className="stat-label">Following</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{profileData.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{profileData.races}</span>
                <span className="stat-label">races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {profileData.ranking}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>

            {/* Bio */}
            {bioText ? (
              <button className="my-profile-bio" onClick={() => setShowBioEdit(true)}>
                {bioText}
              </button>
            ) : (
              <button className="my-profile-bio empty" onClick={() => setShowBioEdit(true)}>
                Add Bio
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="my-profile-actions">
          <button className="action-btn share" onClick={() => setShowShareModal(true)}>share</button>
          <button className="action-btn edit" onClick={() => setShowEditBio(true)}>edit</button>
          <button className="action-btn-icon invite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="16" y1="11" x2="22" y2="11" />
            </svg>
          </button>
        </div>
      </div>

      {/* Candidate Profile Sections - only show when opted in */}
      {hasOptedIn && (
        <div className="my-profile-candidate-sections">
          {/* Reviews Section */}
          <div className="starter-reviews-section">
            <div className="starter-section-header">
              <div className="starter-divider-section">
                <div className="starter-divider left"></div>
                <div className="starter-cp-badge">
                  <span className="starter-cp-c">C</span>
                  <span className="starter-cp-p">P</span>
                </div>
                <div className="starter-divider right"></div>
              </div>
              <span className="starter-section-label">reviews</span>
            </div>
            <p className="starter-reviews-empty">0 reviews yet</p>
          </div>

          {/* Icebreakers Section */}
          <div className="starter-icebreakers-section">
            <div className="starter-icebreakers-header">
              <span className="starter-icebreakers-title">ICEBREAKERS</span>
            </div>
            <button className="starter-add-icebreakers" onClick={onEditIcebreakers}>
              add icebreakers
            </button>
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <div className="my-profile-tabs-section">
        <div className="my-profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`my-profile-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.name}
            >
              <img src={tab.icon} alt={tab.name} className="tab-icon" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="my-profile-content">
        {activeTab === 'posts' && (
          <div className="posts-grid">
            {allPosts.length === 0 ? (
              <div className="posts-empty">
                <p>no posts yet</p>
              </div>
            ) : (
              allPosts.map((post, index) => (
                <div
                  key={post.id || index}
                  className="post-item"
                  onClick={() => handlePostClick(index)}
                >
                  {post.videoUrl ? (
                    <video
                      src={post.videoUrl}
                      className={post.isMirrored ? 'mirrored' : ''}
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => e.target.play()}
                      onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                  ) : (
                    <img src={post.thumbnail || post} alt={`Post ${index + 1}`} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-placeholder">
            <p>No tags yet</p>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="activity-feed">
            {userActivity.length === 0 ? (
              <div className="activity-empty">
                <p>No activity yet</p>
                <span>Your likes, comments, and nominations will appear here</span>
              </div>
            ) : (
              userActivity.map((activity) => (
                <ActivityVideoItem
                  key={activity.id}
                  activity={activity}
                  activityConfig={activityConfig}
                  getPartyColor={getPartyColor}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Bio Overlay - for development */}
      {showEditBio && (
        <div className="edit-bio-overlay">
          <button className="edit-bio-close" onClick={() => setShowEditBio(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <EditBio />
        </div>
      )}

      {/* Single Post View - rendered via portal to escape transformed parent */}
      {showSinglePost && createPortal(
        <SinglePostView
          posts={allPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setShowSinglePost(false)}
          onEndReached={() => setShowSinglePost(false)}
          onPartyClick={onPartyClick}
          onOpenComments={onOpenComments}
          profileName={profileData.username}
        />,
        document.getElementById('modal-root') || document.body
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Profile</h3>
              <button className="share-modal-close" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            <div className="share-modal-options">
              <button className="share-option" onClick={() => {
                navigator.clipboard.writeText(`https://coolpeople.com/@${profileData.username}`)
                setShowShareModal(false)
                setShowCopiedToast(true)
                setTimeout(() => setShowCopiedToast(false), 2000)
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Copy Link</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Send Message</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Share to Story</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>More Options</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="copied-toast">Link copied!</div>
      )}

      {/* Bio Edit Modal */}
      {showBioEdit && createPortal(
        <div className="bio-edit-overlay">
          <div className="bio-edit-modal">
            <div className="bio-edit-header">
              <button className="bio-edit-cancel" onClick={() => {
                setBioText(currentUser?.bio || '')
                setShowBioEdit(false)
              }}>
                Cancel
              </button>
              <h3>Edit Bio</h3>
              <button
                className="bio-edit-save"
                onClick={() => {
                  onBioChange?.(bioText)
                  setShowBioEdit(false)
                }}
              >
                Save
              </button>
            </div>
            <div className="bio-edit-content">
              <textarea
                className="bio-edit-textarea"
                placeholder="Write a short bio..."
                value={bioText}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_MAX_LENGTH) {
                    setBioText(e.target.value)
                  }
                }}
                maxLength={BIO_MAX_LENGTH}
                autoFocus
              />
              <div className="bio-edit-counter">
                <span className={bioText.length >= BIO_MAX_LENGTH ? 'at-limit' : ''}>
                  {bioText.length}/{BIO_MAX_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Avatar Crop Modal - rendered via portal to avoid parent clipping */}
      {showCropModal && cropImage && createPortal(
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <button className="crop-cancel-btn" onClick={handleCropCancel}>
                Cancel
              </button>
              <h3>Adjust Photo</h3>
              <button className="crop-apply-btn" onClick={handleCropApply}>
                Done
              </button>
            </div>

            <div
              className="crop-area"
              onMouseDown={handleCropDragStart}
              onMouseMove={handleCropDragMove}
              onMouseUp={handleCropDragEnd}
              onMouseLeave={handleCropDragEnd}
              onTouchStart={handleCropDragStart}
              onTouchMove={handleCropDragMove}
              onTouchEnd={handleCropDragEnd}
            >
              <div className="crop-image-container">
                <img
                  ref={cropImageRef}
                  src={cropImage}
                  alt="Crop preview"
                  className="crop-image"
                  style={{
                    transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                  }}
                  draggable={false}
                />
              </div>
              <div className="crop-circle-overlay"></div>
            </div>

            <div className="crop-controls">
              <div className="zoom-control">
                <svg className="zoom-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
                </svg>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={cropZoom}
                  onChange={handleZoomChange}
                  className="zoom-slider"
                />
                <svg className="zoom-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm-.5-4h2v2H9V9H7V8h2V6h1v2h2v1h-2v1H9V10z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </div>
  )
}

export default MyProfile
