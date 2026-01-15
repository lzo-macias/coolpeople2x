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
  postImages: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=600&fit=crop',
  ],
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

// Activity feed for Details tab - shows videos with action indicators
const activityFeed = [
  {
    id: 'act-1',
    type: 'like',
    action: 'liked',
    timestamp: '2h ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
      user: { username: 'maya.2024', avatar: 'https://i.pravatar.cc/40?img=44', party: 'Democrat' },
      race: 'NYC Mayor 2024',
      likes: '12.4K',
      comments: '892',
      shares: '2.1K',
      caption: 'Making moves for our community 🗳️',
    },
  },
  {
    id: 'act-2',
    type: 'nominate',
    action: 'nominated',
    timestamp: '5h ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=700&fit=crop',
      user: { username: 'Sara.playa', avatar: 'https://i.pravatar.cc/40?img=23', party: 'The Pink Lady' },
      race: 'City Council District 5',
      likes: '8.2K',
      comments: '456',
      shares: '1.3K',
      caption: 'Together we rise ✊',
    },
  },
  {
    id: 'act-3',
    type: 'comment',
    action: 'commented',
    comment: 'This is exactly what we need!',
    timestamp: '1d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=700&fit=crop',
      user: { username: 'politico.daily', avatar: 'https://i.pravatar.cc/40?img=33', party: 'Independent' },
      race: 'School Board Election',
      likes: '24.1K',
      comments: '1.2K',
      shares: '4.5K',
      caption: 'Democracy in action',
    },
  },
  {
    id: 'act-4',
    type: 'repost',
    action: 'reposted',
    timestamp: '1d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&h=700&fit=crop',
      user: { username: 'community.voice', avatar: 'https://i.pravatar.cc/40?img=55', party: 'Democrat' },
      race: 'State Assembly',
      likes: '5.7K',
      comments: '234',
      shares: '890',
      caption: 'Spreading the word 📢',
    },
  },
  {
    id: 'act-5',
    type: 'endorsement',
    action: 'endorsed',
    timestamp: '2d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=700&fit=crop',
      user: { username: 'Maya.2024', avatar: 'https://i.pravatar.cc/40?img=44', party: 'The Pink Lady' },
      race: 'Borough President',
      likes: '15.3K',
      comments: '678',
      shares: '2.8K',
      caption: 'Endorsed and proud 🌟',
    },
  },
  {
    id: 'act-6',
    type: 'ballot',
    action: 'added to ballot',
    timestamp: '3d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=700&fit=crop',
      user: { username: 'alex.votes', avatar: 'https://i.pravatar.cc/40?img=60', party: 'Republican' },
      race: 'Public Advocate',
      likes: '9.8K',
      comments: '543',
      shares: '1.6K',
      caption: 'Your vote matters',
    },
  },
  {
    id: 'act-7',
    type: 'favorite',
    action: 'favorited',
    timestamp: '4d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=700&fit=crop',
      user: { username: 'pinklady.official', avatar: 'https://i.pravatar.cc/40?img=47', party: 'The Pink Lady' },
      race: 'NYC Mayor 2024',
      likes: '31.2K',
      comments: '2.1K',
      shares: '5.4K',
      caption: 'Official party content 💖',
    },
  },
  {
    id: 'act-8',
    type: 'like',
    action: 'liked',
    timestamp: '5d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop',
      user: { username: 'foodie.voter', avatar: 'https://i.pravatar.cc/40?img=36', party: 'Independent' },
      race: 'City Comptroller',
      likes: '4.5K',
      comments: '189',
      shares: '567',
      caption: 'Politics & good food 🍽️',
    },
  },
]

// Activity type colors and icons
const activityConfig = {
  like: { color: '#FF4D6A', icon: '♥' },
  nominate: { color: '#00F2EA', icon: '★' },
  repost: { color: '#4CAF50', icon: '↻' },
  comment: { color: '#FFB800', icon: '💬' },
  endorsement: { color: '#9B59B6', icon: '✓' },
  ballot: { color: '#FF9500', icon: '☐' },
  favorite: { color: '#FFD700', icon: '★' },
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

function CandidateProfile({ candidate: passedCandidate, onClose, onPartyClick }) {
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
    <div className="candidate-profile">
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
              <img src={candidate.avatar} alt={candidate.username} className="profile-avatar" />
            </div>
            <div className="profile-info">
              <h2 className="profile-username">{candidate.username}</h2>
              <button
                className="profile-party-btn"
                onClick={() => onPartyClick?.(candidate.party)}
              >
                {candidate.party}
              </button>
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-stats-grid">
              <div className="stat-item">
                <span className="stat-number">{candidate.nominations}</span>
                <span className="stat-label">Nominations</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.races || '8'}</span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {candidate.ranking || '.3%'}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>
            <p className="profile-bio">{candidate.bio || 'Running for Mayor. Building a better tomorrow for our community. '}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button className="profile-action-btn messages">messages</button>
          <button className="profile-action-btn nominate">nominate</button>
          <button
            className={`profile-action-btn follow ${isFollowing ? 'following' : ''}`}
            onClick={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? 'following' : 'follow'}
          </button>
        </div>

        {/* Tabs */}
        <div className={`profile-tabs ${activeTab === 'posts' || activeTab === 'details' ? 'posts-active' : ''}`}>
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
      <div className={`profile-content ${activeTab === 'posts' || activeTab === 'details' ? 'posts-active' : ''}`}>
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="posts-grid">
            {candidate.postImages?.map((post, index) => (
              <div key={index} className="post-item">
                <img src={post} alt={`Post ${index + 1}`} />
              </div>
            ))}
          </div>
        )}

        {/* Bio Tab */}
        {activeTab === 'bio' && (
          <>
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

        </div>

        {/* Leave a Review */}
        <p className="leave-review-text">Leave a Review</p>

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
          </>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="activity-feed">
            {activityFeed.map((activity) => {
              const config = activityConfig[activity.type]
              const video = activity.video
              const videoPartyColor = getPartyColor(video.user.party)
              return (
                <div key={activity.id} className="activity-video-card">
                  {/* Action indicator at top */}
                  <div className="activity-action-badge">
                    <span className="activity-action-icon" style={{ color: config.color }}>{config.icon}</span>
                    <span className="activity-action-text">{activity.action}</span>
                    <span className="activity-timestamp">{activity.timestamp}</span>
                  </div>

                  {/* Video container */}
                  <div className="activity-video-container">
                    <img src={video.thumbnail} alt="" className="activity-video-thumbnail" />

                    {/* Overlay content */}
                    <div className="activity-video-overlay">
                      {/* User info - bottom left */}
                      <div className="activity-video-user">
                        <div className="activity-user-avatar" style={{ borderColor: videoPartyColor }}>
                          <img src={video.user.avatar} alt={video.user.username} />
                        </div>
                        <div className="activity-user-info">
                          <span className="activity-username">@{video.user.username}</span>
                          <span className="activity-party" style={{ color: videoPartyColor }}>{video.user.party}</span>
                          <span className="activity-race">{video.race}</span>
                        </div>
                      </div>

                      {/* Caption */}
                      <p className="activity-caption">{video.caption}</p>

                      {/* Engagement sidebar - right side */}
                      <div className="activity-engagement">
                        <div className="engagement-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          <span>{video.likes}</span>
                        </div>
                        <div className="engagement-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 6h-2V4.33C19 3.04 17.96 2 16.67 2H3.33C2.04 2 1 3.04 1 4.33v11.34C1 16.96 2.04 18 3.33 18H5v2.67C5 21.4 5.6 22 6.33 22h14.34c.73 0 1.33-.6 1.33-1.33V7.33C22 6.6 21.4 6 21 6zM3.33 16C3.15 16 3 15.85 3 15.67V4.33C3 4.15 3.15 4 3.33 4h13.34c.18 0 .33.15.33.33V6H6.33C5.6 6 5 6.6 5 7.33V16H3.33zM20 20H7V8h13v12z"/>
                          </svg>
                          <span>{video.comments}</span>
                        </div>
                        <div className="engagement-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                          </svg>
                          <span>{video.shares}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CandidateProfile
