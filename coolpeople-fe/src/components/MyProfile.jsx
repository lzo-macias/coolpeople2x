import { useState, useRef, useEffect } from 'react'
import EditBio from './EditBio'
import SinglePostView from './SinglePostView'
import CandidateProfile from './CandidateProfile'
import { generateSparklineData, getPartyColor } from '../data/mockData'
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

// Current logged-in user data (independent, not opted into social credit)
const myProfileData = {
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: null, // Independent - no party affiliation
  hasOptedIn: false,
  following: '9,999',
  followers: '1M',
  races: '8',
  ranking: '.3%',
  postImages: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
  ],
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

function MyProfile({ onPartyClick, onOptIn, userParty, userPosts = [], hasOptedIn = false, onOpenComments, userActivity = [], onEditIcebreakers }) {
  const [activeTab, setActiveTab] = useState('posts')
  const [showEditBio, setShowEditBio] = useState(false)
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [starterPoints] = useState(() => calculateStarterPoints(userPosts))

  // Use user's created party if available, otherwise default to Independent
  const currentParty = userParty ? userParty.name : (myProfileData.party || 'Independent')
  const partyColor = userParty ? userParty.color : '#808080' // Independent is gray

  // If user has opted in, render as CandidateProfile with starter data
  if (hasOptedIn) {
    const starterCandidate = {
      id: 'my-profile',
      username: myProfileData.username,
      avatar: myProfileData.avatar,
      party: null, // Still Independent
      bio: '', // No bio yet
      nominations: '0',
      followers: myProfileData.followers,
      races: ['CP'], // Just CP race for social credit
      ranking: myProfileData.ranking,
      cpPoints: starterPoints,
      change: `+${(Math.random() * 10).toFixed(2)}`,
      sparklineData: Array(20).fill(0).map((_, i) => starterPoints + Math.floor(Math.random() * 20) - 10),
      filteredSparklineData: Array(20).fill(0).map((_, i) => starterPoints + Math.floor(Math.random() * 15) - 5),
      postImages: myProfileData.postImages,
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
      />
    )
  }

  // Convert default images to reel format with variable engagement scores
  const trends = ['up', 'down', 'stable']
  const mockRaces = ['NYC Mayor 2024', 'City Council District 5', 'State Assembly']
  const defaultPostsAsReels = myProfileData.postImages.map((img, i) => ({
    id: `default-${i}`,
    thumbnail: img,
    user: {
      username: myProfileData.username,
      avatar: myProfileData.avatar,
      party: currentParty,
    },
    title: '',
    caption: '',
    targetRace: mockRaces[i % mockRaces.length],
    stats: { votes: '0', likes: '0', comments: '0', shazam: '0', shares: '0' },
    engagementScores: [
      {
        id: `eng-${i}-1`,
        username: myProfileData.username,
        avatar: myProfileData.avatar,
        party: currentParty,
        sparklineData: generateSparklineData(trends[i % 3]),
        recentChange: i % 2 === 0 ? '+1' : null,
        trend: trends[i % 3],
      },
      {
        id: `eng-${i}-2`,
        username: 'Lzo.macias',
        avatar: 'https://i.pravatar.cc/40?img=1',
        party: 'Democrat',
        sparklineData: generateSparklineData(trends[(i + 1) % 3]),
        recentChange: i % 3 === 0 ? '+2' : null,
        trend: trends[(i + 1) % 3],
      },
      {
        id: `eng-${i}-3`,
        username: 'Sarah.J',
        avatar: 'https://i.pravatar.cc/40?img=5',
        party: 'Republican',
        sparklineData: generateSparklineData(trends[(i + 2) % 3]),
        recentChange: null,
        trend: trends[(i + 2) % 3],
      },
    ],
  }))

  // Combine user posts with default posts (user posts already have reel format)
  const allPosts = userPosts.length > 0
    ? [...userPosts, ...defaultPostsAsReels]
    : defaultPostsAsReels

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
            <div
              className="my-profile-avatar-ring"
              style={{ borderColor: partyColor }}
            >
              <img
                src={myProfileData.avatar}
                alt={myProfileData.username}
                className="my-profile-avatar"
              />
            </div>
            <div className="my-profile-info">
              <h2 className="my-profile-username">{myProfileData.username}</h2>
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
                <span className="stat-number">{myProfileData.following}</span>
                <span className="stat-label">Following</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{myProfileData.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{myProfileData.races}</span>
                <span className="stat-label">races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {myProfileData.ranking}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>

            <div className="my-profile-actions">
              <button className="action-btn share">share</button>
              <button className="action-btn edit" onClick={() => setShowEditBio(true)}>edit</button>
            </div>
          </div>
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
            {allPosts.map((post, index) => (
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
            ))}
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

      {/* Single Post View */}
      {showSinglePost && (
        <SinglePostView
          posts={allPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setShowSinglePost(false)}
          onEndReached={() => setShowSinglePost(false)}
          onPartyClick={onPartyClick}
          onOpenComments={onOpenComments}
          profileName={myProfileData.username}
        />
      )}
    </div>
  )
}

export default MyProfile
