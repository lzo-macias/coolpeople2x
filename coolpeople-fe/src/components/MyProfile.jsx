import { useState } from 'react'
import '../styling/MyProfile.css'

// Current logged-in user data (independent, not opted into social credit)
const myProfileData = {
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: 'Independent',
  hasOptedIn: false,
  following: '9,999',
  followers: '1M',
  posts: '8000',
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

function MyProfile({ onPartyClick, onOptIn }) {
  const [activeTab, setActiveTab] = useState('posts')

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
              style={{ borderColor: myProfileData.party === 'Independent' ? '#000000' : '#FF2A55' }}
            >
              <img
                src={myProfileData.avatar}
                alt={myProfileData.username}
                className="my-profile-avatar"
              />
            </div>
            <div className="my-profile-info">
              <h2 className="my-profile-username">{myProfileData.username}</h2>
              <span className="my-profile-party">{myProfileData.party}</span>
              {!myProfileData.hasOptedIn && (
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
                <span className="stat-number">{myProfileData.posts}</span>
                <span className="stat-label">posts</span>
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
              <button className="action-btn edit">edit</button>
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
            {myProfileData.postImages.map((post, index) => (
              <div key={index} className="post-item">
                <img src={post} alt={`Post ${index + 1}`} />
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
          <div className="bio-placeholder">
            <p>No bio yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyProfile
