import { useState, useMemo } from 'react'
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
  filteredSparklineData: [50, 52, 48, 55, 58, 54, 60, 63, 59, 67, 70, 68, 74, 76, 80, 78, 84, 86, 89, 92],
  bio: 'Running for Mayor. Building a better tomorrow for our community.',
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

// CP paid nominations (verified paid reviews)
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
    isPaid: true,
    tag: 'honesty',
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
    isPaid: true,
    tag: 'generosity',
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
    isPaid: true,
    tag: 'humour',
  },
]

// Profile content sections data
const profileSections = {
  hillToDieOn: {
    title: 'The Hill I Will Die on',
    content: 'Free healthcare for all New Yorkers',
  },
  viewsOnIce: {
    title: 'My views on ICE',
    score: 7,
  },
  viewsOnTransRights: {
    title: 'My views on trans rights',
    score: 7,
  },
  topicsThatEnergize: {
    title: 'Topics that energize me',
    tags: ['Healthcare', 'Trans Rights', 'Immigration', 'Affordability', 'Education'],
  },
  accomplishment: {
    title: "One accomplishment I'm proud of",
    content: 'Lorem Ipsum  Lorem Ipsum  Lorem Ipsum Lorem Ipsum  Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum',
  },
  guessWhichTrue: {
    title: 'Guess Which One is True',
    options: [
      'I saved a puppy from drowning at the park',
      'Beat up an assailant and defended two women',
      'I grew up very poor in the projects and won a bunch of scholarships',
    ],
    correctIndex: 2, // The third option is true
  },
  recentPost: {
    username: 'William.Hiya',
    timestamp: '2 weeks ago',
    media: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  },
}

// Regular nominations (free community reviews)
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
    isPaid: false,
    tag: 'police',
  },
  {
    id: 'nom-5',
    user: {
      username: 'alex.jones',
      avatar: 'https://i.pravatar.cc/40?img=55',
      party: 'Independent',
    },
    text: 'Great leader with a clear vision for our community',
    rating: 4,
    timestamp: '3 days ago',
    media: null,
    isPaid: false,
    tag: 'honesty',
  },
]

function CandidateProfile({ candidate: passedCandidate, onClose }) {
  // Merge passed candidate with defaults for missing properties
  const candidate = { ...mockCandidate, ...passedCandidate }

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedTags, setSelectedTags] = useState(['all']) // array of active tag names
  const [isFollowing, setIsFollowing] = useState(candidate.isFollowing)
  const [isFavorited, setIsFavorited] = useState(candidate.isFavorited)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocalToCandidate] = useState(true) // TODO: determine from user/candidate location
  const [guessState, setGuessState] = useState({
    selected: null,
    transitioning: false,
    revealed: false // Once true, correct answer stays green forever
  })

  // Chart colors cycle (for filtered chart based on tag count)
  const chartColors = [
    '#0EFB49', // green (default/all only)
    '#00F2EA', // teal
    '#FF2A55', // pink
    '#FFD700', // gold
    '#9B59B6', // purple
  ]

  const partyColor = getPartyColor(candidate.party)

  // Get color from gradient based on position (0-10 score)
  const getScoreColor = (score) => {
    const position = score / 10 // 0 to 1
    // Vibrant gradient: #FF1744 (0%) -> #D500F9 (50%) -> #00E5FF (100%)
    if (position <= 0.5) {
      // Interpolate between hot pink and vibrant purple
      const t = position * 2
      const r = Math.round(255 + (213 - 255) * t)
      const g = Math.round(23 + (0 - 23) * t)
      const b = Math.round(68 + (249 - 68) * t)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      // Interpolate between vibrant purple and cyan
      const t = (position - 0.5) * 2
      const r = Math.round(213 + (0 - 213) * t)
      const g = Math.round(0 + (229 - 0) * t)
      const b = Math.round(249 + (255 - 249) * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  // Handle tag click - toggle on/off
  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // Remove tag
        const newTags = prev.filter(t => t !== tag)
        // If nothing selected, default back to 'all'
        return newTags.length === 0 ? ['all'] : newTags
      } else {
        // Add tag
        return [...prev, tag]
      }
    })
  }

  // Get chart color based on selected tags
  const getChartColor = () => {
    // If only 'all' is selected, return green
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return '#0EFB49' // green
    }
    // Count tags excluding 'all'
    const tagCount = selectedTags.filter(t => t !== 'all').length
    // Cycle through colors, cap at last color
    const colorIndex = Math.min(tagCount, chartColors.length - 1)
    return chartColors[colorIndex]
  }

  const chartColor = getChartColor()

  // Get filtered sparkline data based on selected tags
  const getFilteredSparklineData = () => {
    // If only 'all' is selected, return overall data
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return tagSparklineData.all
    }
    // Get tags excluding 'all'
    const activeTags = selectedTags.filter(t => t !== 'all')
    if (activeTags.length === 0) return tagSparklineData.all

    // If one tag, return its data
    if (activeTags.length === 1) {
      return tagSparklineData[activeTags[0]] || tagSparklineData.all
    }

    // Multiple tags: average the data points
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

  // Calculate change value from sparkline data
  const getChangeValue = (data) => {
    if (!data || data.length < 2) return '+0.00'
    const first = data[0]
    const last = data[data.length - 1]
    const change = ((last - first) / first) * 100
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)
  }

  const filteredChange = getChangeValue(filteredSparklineData)

  // Handle guess selection
  const handleGuess = (index) => {
    if (guessState.revealed || guessState.transitioning) return // Already revealed or transitioning

    const isCorrect = index === profileSections.guessWhichTrue.correctIndex
    setGuessState({ selected: index, transitioning: true, revealed: false })

    // After 1 second, end transition and reveal correct answer permanently
    setTimeout(() => {
      setGuessState({ selected: index, transitioning: false, revealed: true })
    }, 1000)
  }

  // Get class for guess bubble based on state
  const getGuessClass = (index) => {
    const isCorrect = index === profileSections.guessWhichTrue.correctIndex
    const wasSelected = index === guessState.selected

    // After reveal: only correct answer stays green
    if (guessState.revealed) {
      return isCorrect ? 'correct' : ''
    }

    // During transition
    if (guessState.transitioning) {
      if (wasSelected && isCorrect) {
        return 'correct transitioning'
      }
      if (wasSelected && !isCorrect) {
        return 'incorrect transitioning'
      }
      if (!wasSelected && isCorrect) {
        // Show correct answer when user guessed wrong
        return 'correct'
      }
    }

    return ''
  }

  // Format change value to always show + for positive numbers
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
    { name: 'Reviews', icon: '/icons/profile/userprofile/reviews-icon.svg' },
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
    <div className="candidate-profile">
      {/* Header */}
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
              <img src={candidate.avatar} alt={candidate.username} className="profile-avatar" />
            </div>
            <div className="profile-info">
              <h2 className="profile-username">{candidate.username}</h2>
              <span className="profile-party" style={{ color: partyColor }}>{candidate.party}</span>
            </div>
          </div>

          <div className="profile-right">
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
            {/* Overall Chart in header */}
            <div className="chart-container header-chart">
              <div className="chart-header">
                <span className="chart-label">Overall</span>
                <span className="chart-change" style={{ background: '#0EFB49' }}>{formatChange(candidate.change)}</span>
              </div>
              <div className="chart-wrapper">
                <Sparkline
                  data={candidate.sparklineData}
                  color="#0EFB49"
                  width={190}
                  height={45}
                  strokeWidth={1.5}
                  showBaseline={true}
                />
              </div>
            </div>
          </div>
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
          <div className="chart-header">
            <span className="chart-label">
              {selectedTags.length === 1 && selectedTags[0] === 'all' && !searchQuery
                ? 'All Tags'
                : searchQuery
                  ? `"${searchQuery}"`
                  : selectedTags.map(t => `#${t}`).join(' ')}
            </span>
            <span
              className="chart-change"
              style={{ background: chartColor }}
            >
              {filteredChange}
            </span>
          </div>
          <div className="chart-wrapper">
            <Sparkline
              data={filteredSparklineData}
              color={chartColor}
              width={340}
              height={70}
              strokeWidth={1.5}
              showBaseline={true}
            />
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

        {/* Nominations List */}
        <div className="nominations-list">
          {/* CP Verified Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section">
              <div className="nomination-divider"></div>
              <div className="cp-badge">
                <div className="cp-badge-circle">
                  <span className="cp-badge-c">C</span>
                  <span className="cp-badge-p">P</span>
                </div>
              </div>
            </div>
            <span className="cp-section-label verified">Verified Reviews</span>
          </div>

          {/* Paid Nominations */}
          {paidNominations.map((nomination, index) => (
            <div key={nomination.id} className="nomination-item paid">
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
                  <span className="cp-verified-badge">✓</span>
                </div>
                <span className="nomination-time">{nomination.timestamp}</span>
              </div>

              {nomination.text && (
                <p className="nomination-text">{nomination.text}</p>
              )}

              {nomination.media ? (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                  <div className="nomination-rating overlay">
                    {renderStars(nomination.rating)}
                  </div>
                </div>
              ) : (
                <div className="nomination-rating">
                  {renderStars(nomination.rating)}
                </div>
              )}
            </div>
          ))}

          {/* Leave a Verified Review link - below paid nominations, if local */}
          {isLocalToCandidate && (
            <button className="leave-review-link verified">Leave a Verified Review</button>
          )}

          {/* Community Reviews Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section community">
              <div className="nomination-divider community"></div>
            </div>
            <span className="cp-section-label community">Community Reviews</span>
          </div>

          {/* Regular Nominations */}
          {regularNominations.map((nomination, index) => (
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

              {nomination.media ? (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                  <div className="nomination-rating overlay">
                    {renderStars(nomination.rating)}
                  </div>
                </div>
              ) : (
                <div className="nomination-rating">
                  {renderStars(nomination.rating)}
                </div>
              )}
            </div>
          ))}

          {/* Leave a Review link - below community nominations, if not local */}
          {!isLocalToCandidate && (
            <button className="leave-review-link community">Leave a Review</button>
          )}
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

        {/* Profile Sections */}
        <div className="profile-sections">
          {/* The Hill I Will Die On */}
          <div className="profile-section">
            <span className="section-title">{profileSections.hillToDieOn.title}</span>
            <h3 className="section-content-large">{profileSections.hillToDieOn.content}</h3>
            <div className="section-footer">
              <div className="reaction-icons">
                <button className="reaction-btn"><span className="reaction-dot"></span></button>
                <button className="reaction-btn"><span className="reaction-dot dark"></span></button>
              </div>
              <button className="see-more-btn">See more ›</button>
            </div>
          </div>

          {/* My views on ICE */}
          <div className="profile-section">
            <span className="section-title">{profileSections.viewsOnIce.title}</span>
            <div className="score-bar-container">
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${profileSections.viewsOnIce.score * 10}%` }}></div>
                <div className="score-indicator" style={{
                  left: `${profileSections.viewsOnIce.score * 10}%`,
                  background: getScoreColor(profileSections.viewsOnIce.score)
                }}>
                  <span className="score-value">{profileSections.viewsOnIce.score}</span>
                </div>
              </div>
            </div>
            <div className="section-footer">
              <div className="reaction-icons">
                <button className="reaction-btn"><span className="reaction-dot"></span></button>
                <button className="reaction-btn"><span className="reaction-dot dark"></span></button>
              </div>
              <button className="see-more-btn">See more ›</button>
            </div>
          </div>

          {/* Topics that energize me */}
          <div className="profile-section">
            <span className="section-title">{profileSections.topicsThatEnergize.title}</span>
            <div className="energize-tags">
              {profileSections.topicsThatEnergize.tags.map((tag) => (
                <span key={tag} className="energize-tag">{tag}</span>
              ))}
            </div>
          </div>

          {/* One accomplishment I'm proud of */}
          <div className="profile-section">
            <span className="section-title">{profileSections.accomplishment.title}</span>
            <p className="section-content-text">{profileSections.accomplishment.content}</p>
            <div className="section-footer">
              <div className="reaction-icons">
                <button className="reaction-btn"><span className="reaction-dot"></span></button>
                <button className="reaction-btn"><span className="reaction-dot dark"></span></button>
              </div>
              <button className="see-more-btn">See more ›</button>
            </div>
          </div>

          {/* Guess Which One is True */}
          <div className="profile-section">
            <span className="section-title guess">{profileSections.guessWhichTrue.title}</span>
            <div className="guess-options">
              {profileSections.guessWhichTrue.options.map((option, index) => (
                <button
                  key={index}
                  className={`guess-bubble ${getGuessClass(index)}`}
                  onClick={() => handleGuess(index)}
                  disabled={guessState.transitioning || guessState.revealed}
                >
                  <span className="guess-text">{option}</span>
                  {guessState.selected === index && guessState.transitioning && (
                    <span className="guess-icon">
                      {index === profileSections.guessWhichTrue.correctIndex ? '✓' : '✕'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* My views on trans rights */}
          <div className="profile-section">
            <span className="section-title">{profileSections.viewsOnTransRights.title}</span>
            <div className="score-bar-container">
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${profileSections.viewsOnTransRights.score * 10}%` }}></div>
                <div className="score-indicator" style={{
                  left: `${profileSections.viewsOnTransRights.score * 10}%`,
                  background: getScoreColor(profileSections.viewsOnTransRights.score)
                }}>
                  <span className="score-value">{profileSections.viewsOnTransRights.score}</span>
                </div>
              </div>
            </div>
            <div className="section-footer">
              <div className="reaction-icons">
                <button className="reaction-btn"><span className="reaction-dot"></span></button>
                <button className="reaction-btn"><span className="reaction-dot dark"></span></button>
              </div>
              <button className="see-more-btn">See more ›</button>
            </div>
          </div>

          {/* Recent Post */}
          <div className="profile-section post">
            <div className="post-header">
              <span className="post-username">{profileSections.recentPost.username}</span>
              <span className="post-timestamp">{profileSections.recentPost.timestamp}</span>
            </div>
            <div className="post-media">
              <img src={profileSections.recentPost.media} alt="Post media" />
              <button className="post-nav-btn">›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateProfile
