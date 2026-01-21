import { useState } from 'react'
import EditBio from './EditBio'
import SinglePostView from './SinglePostView'
import { generateSparklineData } from '../data/mockData'
import '../styling/MyProfile.css'

// Current logged-in user data (independent, not opted into social credit)
const myProfileData = {
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: 'Independent',
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

function MyProfile({ onPartyClick, onOptIn, userParty, userPosts = [], hasOptedIn = false, onOpenComments }) {
  const [activeTab, setActiveTab] = useState('posts')
  const [showEditBio, setShowEditBio] = useState(false)
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)

  // Use user's created party if available, otherwise default to Independent
  const currentParty = userParty ? userParty.name : myProfileData.party
  const partyColor = userParty ? userParty.color : '#808080' // Independent is gray

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
    { name: 'Bio', id: 'bio', icon: '/icons/profile/userprofile/bio-icon.svg' },
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

        {activeTab === 'bio' && (
          <EditBio />
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
