import { useState } from 'react'
import '../styling/CandidateProfile.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

// Mock data for the candidate profile
const mockCandidate = {
  id: 'user-1',
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: 'The Pink Lady Party',
  nominations: '9,999',
  followers: '1M',
  change: '+301.26',
  isFollowing: false,
  isFavorited: false,
  sparklineData: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
  bio: 'Running for Mayor. Building a better tomorrow for our community.',
}

const mockTags = ['all', 'trans', 'police', 'honesty', 'generosity', 'humour']

// CP paid nominations (appear above the divider)
const paidNominations = [
  {
    id: 'nom-1',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'Democrat',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
  },
  {
    id: 'nom-2',
    user: {
      username: 'hi.its.mario',
      avatar: 'https://i.pravatar.cc/40?img=33',
      party: 'Republican',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '1 day ago',
    media: null,
  },
  {
    id: 'nom-3',
    user: {
      username: 'lolo.macias',
      avatar: 'https://i.pravatar.cc/40?img=44',
      party: 'The Pink Lady Party',
    },
    text: '',
    rating: 4,
    timestamp: '1 day ago',
    media: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop',
  },
]

// Regular nominations (appear below the divider)
const regularNominations = [
  {
    id: 'nom-4',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'Democrat',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
  },
]

function CandidateProfile({ candidate: passedCandidate, onClose }) {
  // Merge passed candidate with defaults for missing properties
  const candidate = { ...mockCandidate, ...passedCandidate }

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedTag, setSelectedTag] = useState('all')
  const [isFollowing, setIsFollowing] = useState(candidate.isFollowing)
  const [isFavorited, setIsFavorited] = useState(candidate.isFavorited)
  const [searchQuery, setSearchQuery] = useState('')

  const partyColor = getPartyColor(candidate.party)

  // Format change value to always show + for positive numbers
  const formatChange = (value) => {
    if (typeof value === 'string') return value
    const num = parseFloat(value)
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)
  }

  const tabs = ['Bio', 'Posts', 'Tags', 'Details']

  const renderStars = (count) => {
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={star <= count ? '#FFD700' : 'none'}
            stroke={star <= count ? '#FFD700' : '#666'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    )
  }

  return (
    <div className="candidate-profile">
      {/* Header - lighter background */}
      <div className="profile-header">
        {/* Message icon */}
        <button className="message-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        {/* Favorite star */}
        <button
          className={`favorite-star ${isFavorited ? 'active' : ''}`}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#FFD700' : 'none'} stroke={isFavorited ? '#FFD700' : '#888'} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Top row: Avatar + Stats */}
        <div className="profile-top">
          <div
            className="profile-avatar-ring"
            style={{ borderColor: partyColor }}
          >
            <img src={candidate.avatar} alt={candidate.username} className="profile-avatar" />
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">{candidate.nominations}</span>
              <span className="stat-label">Nominations</span>
              <button className="stat-action">Nominate</button>
            </div>
            <div className="stat-item">
              <span className="stat-number">{candidate.followers}</span>
              <span className="stat-label">Followers</span>
              <button
                className={`stat-action ${isFollowing ? 'following' : ''}`}
                onClick={() => setIsFollowing(!isFollowing)}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>

        {/* Second row: Username/Party + Sparkline */}
        <div className="profile-info-row">
          <div className="profile-info">
            <h2 className="profile-username">{candidate.username}</h2>
            <span className="profile-party" style={{ color: partyColor }}>{candidate.party}</span>
          </div>
          <div className="header-sparkline">
            <Sparkline
              data={candidate.sparklineData}
              color="#00cc66"
              width={180}
              height={45}
              strokeWidth={1.5}
            />
            <span className="profile-change">{formatChange(candidate.change)}</span>
          </div>
        </div>

        {/* Tabs in header */}
        <div className="profile-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`profile-tab ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content - dark background */}
      <div className="profile-content">
        {/* Search */}
        <div className="profile-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Large Sparkline Chart */}
        <div className="profile-chart">
          <Sparkline
            data={candidate.sparklineData}
            color="#00cc66"
            width={320}
            height={80}
          />
          <span className="chart-change">{formatChange(candidate.change)}</span>
        </div>

        {/* Tag Pills */}
        <div className="tag-pills">
          {mockTags.map((tag) => (
            <button
              key={tag}
              className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Nominations List */}
        <div className="nominations-list">
          {/* CP Divider - separates paid reviews */}
          <div className="cp-divider-section">
            <div className="cp-badge">
              <div className="cp-badge-circle">
                <span className="cp-badge-c">C</span>
                <span className="cp-badge-p">P</span>
              </div>
            </div>
            <div className="nomination-divider"></div>
          </div>

          {/* Paid Nominations */}
          {paidNominations.map((nomination) => (
            <div key={nomination.id} className="nomination-item">
              <div className="nomination-header">
                <div className="nomination-user">
                  <div
                    className="nomination-avatar-ring"
                    style={{ borderColor: getPartyColor(nomination.user.party) }}
                  >
                    <img
                      src={nomination.user.avatar}
                      alt={nomination.user.username}
                      className="nomination-avatar"
                    />
                  </div>
                  <span className="nomination-username">{nomination.user.username}</span>
                </div>
                <span className="nomination-time">{nomination.timestamp}</span>
              </div>

              {nomination.text && (
                <p className="nomination-text">{nomination.text}</p>
              )}

              {nomination.media && (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                </div>
              )}

              <div className="nomination-rating">
                {renderStars(nomination.rating)}
              </div>
            </div>
          ))}

          {/* CP Divider - separates regular reviews */}
          <div className="cp-divider-section">
            <div className="cp-badge">
              <div className="cp-badge-circle">
                <span className="cp-badge-c">C</span>
                <span className="cp-badge-p">P</span>
              </div>
            </div>
            <div className="nomination-divider"></div>
          </div>

          {/* Regular Nominations */}
          {regularNominations.map((nomination) => (
            <div key={nomination.id} className="nomination-item">
              <div className="nomination-header">
                <div className="nomination-user">
                  <div
                    className="nomination-avatar-ring"
                    style={{ borderColor: getPartyColor(nomination.user.party) }}
                  >
                    <img
                      src={nomination.user.avatar}
                      alt={nomination.user.username}
                      className="nomination-avatar"
                    />
                  </div>
                  <span className="nomination-username">{nomination.user.username}</span>
                </div>
                <span className="nomination-time">{nomination.timestamp}</span>
              </div>

              {nomination.text && (
                <p className="nomination-text">{nomination.text}</p>
              )}

              {nomination.media && (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                </div>
              )}

              <div className="nomination-rating">
                {renderStars(nomination.rating)}
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="load-more-buttons">
          <button className="load-more-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 6 12 12 18 6"></polyline>
              <polyline points="6 12 12 18 18 12"></polyline>
            </svg>
          </button>
          <button className="load-more-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 6 12 12 18 6"></polyline>
              <polyline points="6 12 12 18 18 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CandidateProfile
