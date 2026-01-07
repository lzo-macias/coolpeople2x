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
  isFollowing: false,
  hasOptedIn: false, // whether they've opted into social credit
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

  const hasParty = participant.party && participant.party !== 'Independent'
  const partyColor = hasParty ? getPartyColor(participant.party) : '#808080'
  const partyDisplay = hasParty ? participant.party : 'Independent'

  const tabs = ['Posts', 'Tags', 'Bio']

  return (
    <div className="participant-profile">
      {/* Header */}
      <div className="participant-header">
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
            <div className="participant-stats">
              <div className="stat-item">
                <span className="stat-number">{participant.nominations}</span>
                <span className="stat-label">Nominations</span>
                <button className="stat-action">Nominate</button>
              </div>
              <div className="stat-item">
                <span className="stat-number">{participant.followers}</span>
                <span className="stat-label">Followers</span>
                <button
                  className={`stat-action ${isFollowing ? 'following' : ''}`}
                  onClick={() => setIsFollowing(!isFollowing)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            {!isOwnProfile && (
              <div className="participant-actions">
                <button className="action-btn invite">invite</button>
                <button className="action-btn message">message</button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="participant-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`participant-tab ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
              {tab}
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
