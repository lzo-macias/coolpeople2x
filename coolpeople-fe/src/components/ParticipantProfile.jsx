import { useState } from 'react'
import '../styling/ParticipantProfile.css'
import { getPartyColor } from '../data/mockData'

// Mock data for the participant profile
const mockParticipant = {
  id: 'user-1',
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: null, // null = Independent, or party name like 'The Pink Lady'
  nominations: '9,999',
  followers: '1M',
  races: '8',
  ranking: '.3%',
  isFollowing: false,
  isFavorited: false,
  hasOptedIn: false, // whether they've opted into social credit
  bio: 'Building connections. Making a difference in our community.',
  posts: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
  ],
}

function ParticipantProfile({
  participant: passedParticipant,
  isOwnProfile = false,
  onPartyClick,
  onOptIn,
}) {
  // Merge passed participant with defaults
  const participant = { ...mockParticipant, ...passedParticipant }

  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(participant.isFollowing)
  const [isFavorited, setIsFavorited] = useState(participant.isFavorited)

  const hasParty = participant.party && participant.party !== 'Independent'
  const partyColor = hasParty ? getPartyColor(participant.party) : '#808080'
  const partyDisplay = hasParty ? participant.party : 'Independent'

  const tabs = [
    { name: 'Posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
    { name: 'Tags', icon: '/icons/profile/userprofile/tags-icons.svg' },
    { name: 'Bio', icon: '/icons/profile/userprofile/bio-icon.svg' },
  ]

  return (
    <div className="participant-profile">
      {/* Header */}
      <div className="participant-header">
        {/* Favorite star */}
        <button
          className={`favorite-star ${isFavorited ? 'active' : ''}`}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#777777' : 'none'} stroke="#777777" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Top row: Avatar + Stats */}
        <div className="participant-top">
          <div className="participant-left">
            <div
              className="participant-avatar-ring"
              style={{ borderColor: hasParty ? partyColor : '#FF2A55' }}
            >
              <img src={participant.avatar} alt={participant.username} className="participant-avatar" />
            </div>
            <div className="participant-info">
              <h2 className="participant-username">{participant.username}</h2>
              <div className="participant-party-row">
                {hasParty ? (
                  <button
                    className="participant-party-btn"
                    style={{ color: partyColor }}
                    onClick={() => onPartyClick?.(participant.party)}
                  >
                    {partyDisplay}
                  </button>
                ) : (
                  <span className="participant-party-text">{partyDisplay}</span>
                )}
                {isOwnProfile && !participant.hasOptedIn && (
                  <button className="opt-in-btn" onClick={onOptIn}>
                    opt in
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="participant-right">
            <div className="participant-stats-grid">
              <div className="stat-item">
                <span className="stat-number">{participant.nominations}</span>
                <span className="stat-label">Nominations</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{participant.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{participant.races || '8'}</span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {participant.ranking || '.3%'}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>
            <p className="participant-bio">{participant.bio || 'Building connections. Making a difference in our community.'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="participant-actions">
            <button className="participant-action-btn messages">messages</button>
            <button className="participant-action-btn nominate">nominate</button>
            <button
              className={`participant-action-btn follow ${isFollowing ? 'following' : ''}`}
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? 'following' : 'follow'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="participant-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`participant-tab ${activeTab === tab.name.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.name.toLowerCase())}
              title={tab.name}
            >
              <img src={tab.icon} alt={tab.name} className="tab-icon" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="participant-content">
        {activeTab === 'posts' && (
          <div className="posts-grid">
            {participant.posts.map((post, index) => (
              <div key={index} className="post-item">
                <img src={post} alt={`Post ${index + 1}`} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-placeholder">
            <p>Tags content coming soon...</p>
          </div>
        )}

        {activeTab === 'bio' && (
          <div className="bio-placeholder">
            <p>Bio content coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticipantProfile
