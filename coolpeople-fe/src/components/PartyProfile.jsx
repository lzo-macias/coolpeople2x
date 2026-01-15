import { useState } from 'react'
import '../styling/PartyProfile.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

// Mock data for the party profile
const mockParty = {
  id: 'party-1',
  name: 'The Pink Lady',
  avatar: 'https://i.pravatar.cc/150?img=12',
  color: '#e91e8c',
  members: '9,999',
  followers: '1M',
  change: '+301.26',
  isFollowing: false,
  isFavorited: false,
  sparklineData: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
  filteredSparklineData: [50, 52, 48, 55, 58, 54, 60, 63, 59, 67, 70, 68, 74, 76, 80, 78, 84, 86, 89, 92],
  // bio: 'A progressive party focused on equality, justice, and community empowerment.',
}

const mockTags = ['all', 'trans', 'police', 'honesty', 'generosity', 'humour']

// Sparkline data for each tag category
const tagSparklineData = {
  all: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
  trans: [30, 35, 32, 40, 45, 42, 50, 55, 52, 60, 58, 62, 65, 68, 70, 72, 75, 78, 80, 85],
  police: [60, 55, 58, 52, 48, 50, 45, 48, 42, 40, 38, 42, 45, 48, 50, 52, 55, 58, 60, 62],
  honesty: [70, 72, 75, 78, 80, 82, 85, 83, 80, 78, 82, 85, 88, 90, 92, 94, 96, 95, 93, 95],
  generosity: [50, 52, 55, 58, 60, 58, 55, 52, 50, 55, 60, 65, 70, 75, 80, 78, 75, 72, 70, 68],
  humour: [40, 45, 50, 55, 60, 65, 70, 68, 72, 75, 78, 80, 75, 70, 72, 78, 82, 85, 88, 92],
}

// CP paid member testimonials (verified paid reviews)
const paidMemberTestimonials = [
  {
    id: 'member-1',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'The Pink Lady',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
    isPaid: true,
    tag: 'honesty',
  },
  {
    id: 'member-2',
    user: {
      username: 'hi.its.mario',
      avatar: 'https://i.pravatar.cc/40?img=33',
      party: 'The Pink Lady',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '1 day ago',
    media: null,
    isPaid: true,
    tag: 'generosity',
  },
  {
    id: 'member-3',
    user: {
      username: 'lolo.macias',
      avatar: 'https://i.pravatar.cc/40?img=44',
      party: 'The Pink Lady',
    },
    text: '',
    rating: 4,
    timestamp: '1 day ago',
    media: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop',
    isPaid: true,
    tag: 'humour',
  },
]

// Regular member testimonials (community reviews)
const regularMemberTestimonials = [
  {
    id: 'member-4',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'The Pink Lady',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
    isPaid: false,
    tag: 'police',
  },
  {
    id: 'member-5',
    user: {
      username: 'alex.jones',
      avatar: 'https://i.pravatar.cc/40?img=55',
      party: 'The Pink Lady',
    },
    text: 'Great party with a clear vision for our community',
    rating: 4,
    timestamp: '3 days ago',
    media: null,
    isPaid: false,
    tag: 'honesty',
  },
]

function PartyProfile({ party: passedParty, onMemberClick }) {
  // Merge passed party with defaults for missing properties
  const party = { ...mockParty, ...passedParty }

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedTags, setSelectedTags] = useState(['all'])
  const [isFollowing, setIsFollowing] = useState(party.isFollowing)
  const [isFavorited, setIsFavorited] = useState(party.isFavorited)
  const [hasJoined, setHasJoined] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Chart colors cycle (for filtered chart based on tag count)
  const chartColors = [
    '#0EFB49', // green (default/all only)
    '#00F2EA', // teal
    '#FF2A55', // pink
    '#FFD700', // gold
    '#9B59B6', // purple
  ]

  const partyColor = party.color || getPartyColor(party.name)

  // Handle tag click - toggle on/off
  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        const newTags = prev.filter(t => t !== tag)
        return newTags.length === 0 ? ['all'] : newTags
      } else {
        return [...prev, tag]
      }
    })
  }

  // Get chart color based on selected tags
  const getChartColor = () => {
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return '#0EFB49'
    }
    const tagCount = selectedTags.filter(t => t !== 'all').length
    const colorIndex = Math.min(tagCount, chartColors.length - 1)
    return chartColors[colorIndex]
  }

  const chartColor = getChartColor()

  // Get filtered sparkline data based on selected tags
  const getFilteredSparklineData = () => {
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return tagSparklineData.all
    }
    const activeTags = selectedTags.filter(t => t !== 'all')
    if (activeTags.length === 0) return tagSparklineData.all

    if (activeTags.length === 1) {
      return tagSparklineData[activeTags[0]] || tagSparklineData.all
    }

    const dataLength = tagSparklineData.all.length
    const averaged = []
    for (let i = 0; i < dataLength; i++) {
      const sum = activeTags.reduce((acc, tag) => {
        return acc + (tagSparklineData[tag]?.[i] || 0)
      }, 0)
      averaged.push(Math.round(sum / activeTags.length))
    }
    return averaged
  }

  const filteredSparklineData = getFilteredSparklineData()

  // Calculate badge positions based on sparkline data
  const getBadgePositions = (data) => {
    if (!data || data.length < 2) return { ratingTop: 10, changeTop: 45 }

    const chartHeight = 84
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Get the last value (where the line ends)
    const lastValue = data[data.length - 1]

    // Calculate Y position of the end point (inverted because SVG y=0 is top)
    const endY = chartHeight - ((lastValue - min) / range) * chartHeight

    // Position rating badge slightly below the end point, but not too low
    const ratingTop = Math.max(5, Math.min(endY + 5, 40))

    // Position change indicator below rating, but above baseline (baseline is ~50% = 42px)
    const changeTop = Math.min(ratingTop + 30, 55)

    return { ratingTop, changeTop }
  }

  const badgePositions = getBadgePositions(filteredSparklineData)

  // Calculate change value from sparkline data
  const getChangeValue = (data) => {
    if (!data || data.length < 2) return '+0.00'
    const first = data[0]
    const last = data[data.length - 1]
    const change = ((last - first) / first) * 100
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)
  }

  const filteredChange = getChangeValue(filteredSparklineData)

  // Format change value
  const formatChange = (value) => {
    if (typeof value === 'string') return value
    const num = parseFloat(value)
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)
  }

  const tabs = [
    { name: 'Bio', icon: '/icons/profile/userprofile/bio-icon.svg' },
    { name: 'Posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
    { name: 'Tags', icon: '/icons/profile/userprofile/tags-icons.svg' },
    { name: 'Details', icon: '/icons/profile/userprofile/details-icon.svg' },
  ]

  const renderStars = (count) => {
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={star <= count ? '#777777' : 'none'}
            stroke="#777777"
            strokeWidth="1.5"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    )
  }

  return (
    <div className="party-profile">
      {/* Header */}
      <div className="profile-header">
        {/* Favorite star */}
        <button
          className={`favorite-star ${isFavorited ? 'active' : ''}`}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#777777' : 'none'} stroke="#777777" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Top row: Avatar column + Stats + Sparkline */}
        <div className="profile-top">
          <div className="profile-left">
            <div
              className="profile-avatar-ring"
              style={{ borderColor: partyColor }}
            >
              <img src={party.avatar} alt={party.name} className="profile-avatar-party" />
            </div>
            <div className="profile-info">
              <span className="profile-party-name">{party.name}</span>
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-stats-grid">
              <div className="stat-item">
                <span className="stat-number">{party.members}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{party.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>
            <p className="profile-bio">{party.bio || ''}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button className="profile-action-btn join" onClick={() => setHasJoined(!hasJoined)}>
            {hasJoined ? 'joined' : 'join'}
          </button>
          {/* <button className="profile-action-btn message">message</button> */}
          <button
            className={`profile-action-btn follow ${isFollowing ? 'following' : ''}`}
            onClick={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? 'following' : 'follow'}
          </button>
          <button className="profile-action-icon invite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="16" y1="11" x2="22" y2="11" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`profile-tab ${activeTab === tab.name.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.name.toLowerCase())}
              title={tab.name}
            >
              <img src={tab.icon} alt={tab.name} className="tab-icon" />
            </button>
          ))}
        </div>
      </div>

      {/* Content - dark background */}
      <div className="profile-content">
        {/* Search Bar */}
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

        {/* Filtered Chart - Full Width */}
        <div className="chart-container full-width">
          <div className="chart-wrapper">
            <Sparkline
              data={filteredSparklineData}
              color={chartColor}
              width={340}
              height={84}
              strokeWidth={2}
              showBaseline={true}
            />
            <div className="chart-rating-badge" style={{ top: `${badgePositions.ratingTop}px` }}>
              <span className="rating-value">3.2</span>
              <div className="rating-star-circle">
                <svg className="rating-star" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
            <div className="chart-change-indicator" style={{ top: `${badgePositions.changeTop}px` }}>
              <span
                className="chart-change"
                style={{ background: '#42FF87' }}
              >
                {filteredChange}
              </span>
            </div>
          </div>
        </div>

        {/* Tag Pills */}
        <div className="tag-pills-container">
          <div className="tag-pills">
            {mockTags.map((tag) => {
              const isActive = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  className={`tag-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Members List */}
        <div className="members-list">
          {/* CP Verified Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section">
              <div className="member-divider"></div>
              <div className="cp-badge">
                <div className="cp-badge-circle">
                  <span className="cp-badge-c">C</span>
                  <span className="cp-badge-p">P</span>
                </div>
              </div>
            </div>
            <span className="cp-section-label verified">Verified Members</span>
          </div>

          {/* Paid Member Testimonials */}
          {paidMemberTestimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="member-item paid"
              onClick={() => onMemberClick?.(testimonial.user)}
            >
              <div className="member-header">
                <div className="member-user">
                  <div
                    className="member-avatar-ring"
                    style={{ borderColor: partyColor }}
                  >
                    <img
                      src={testimonial.user.avatar}
                      alt={testimonial.user.username}
                      className="member-avatar"
                    />
                  </div>
                  <span className="member-username">{testimonial.user.username}</span>
                  <span className="cp-verified-badge">&#10003;</span>
                </div>
                <span className="member-time">{testimonial.timestamp}</span>
              </div>

              {testimonial.text && (
                <p className="member-text">{testimonial.text}</p>
              )}

              {testimonial.media ? (
                <div className="member-media">
                  <img src={testimonial.media} alt="Member media" />
                  <div className="member-rating overlay">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
              ) : (
                <div className="member-rating">
                  {renderStars(testimonial.rating)}
                </div>
              )}
            </div>
          ))}

          {/* Community Members Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section community">
              <div className="member-divider community"></div>
            </div>
            <span className="cp-section-label community">Community Members</span>
          </div>

          {/* Regular Member Testimonials */}
          {regularMemberTestimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="member-item"
              onClick={() => onMemberClick?.(testimonial.user)}
            >
              <div className="member-header">
                <div className="member-user">
                  <div
                    className="member-avatar-ring"
                    style={{ borderColor: partyColor }}
                  >
                    <img
                      src={testimonial.user.avatar}
                      alt={testimonial.user.username}
                      className="member-avatar"
                    />
                  </div>
                  <span className="member-username">{testimonial.user.username}</span>
                </div>
                <span className="member-time">{testimonial.timestamp}</span>
              </div>

              {testimonial.text && (
                <p className="member-text">{testimonial.text}</p>
              )}

              {testimonial.media ? (
                <div className="member-media">
                  <img src={testimonial.media} alt="Member media" />
                  <div className="member-rating overlay">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
              ) : (
                <div className="member-rating">
                  {renderStars(testimonial.rating)}
                </div>
              )}
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

export default PartyProfile
