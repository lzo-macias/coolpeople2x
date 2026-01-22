import { useState } from 'react'
import '../styling/PartyProfile.css'
import { getPartyColor } from '../data/mockData'
import EditBio from './EditBio'
import SinglePostView from './SinglePostView'

// CoolPeople Tier System
const CP_TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver', min: 1000, max: 2499, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold', min: 2500, max: 4999, color: '#FFD700', icon: '🥇' },
  { name: 'Diamond', min: 5000, max: 9999, color: '#B9F2FF', icon: '💎' },
  { name: 'Master', min: 10000, max: 24999, color: '#9B59B6', icon: '👑' },
  { name: 'Challenger', min: 25000, max: Infinity, color: '#FF4500', icon: '🔥' },
]

const getCurrentTier = (points) => {
  return CP_TIERS.find(tier => points >= tier.min && points <= tier.max) || CP_TIERS[0]
}

const getNextTier = (points) => {
  const currentIndex = CP_TIERS.findIndex(tier => points >= tier.min && points <= tier.max)
  return currentIndex < CP_TIERS.length - 1 ? CP_TIERS[currentIndex + 1] : null
}

// Mock data for the party profile
const mockParty = {
  id: 'party-1',
  name: 'The Pink Lady',
  avatar: 'https://i.pravatar.cc/150?img=12',
  color: '#e91e8c',
  members: '9,999',
  followers: '1M',
  change: '+301.26',
  cpPoints: 8750, // Party CP points
  isFollowing: false,
  isFavorited: false,
  // Races the party participates in
  races: ['Best Party', 'Best in Brooklyn', 'Best in Queens'],
  // bio: 'A progressive party focused on equality, justice, and community empowerment.',
}

// Race data for CP filtering - party-specific performance
const raceData = {
  'Best Party': {
    cpPoints: 8750,
    change: '+187.50',
    tier: 'Diamond'
  },
  'Best in Brooklyn': {
    cpPoints: 6200,
    change: '+92.30',
    tier: 'Diamond'
  },
  'Best in Queens': {
    cpPoints: 4500,
    change: '-25.20',
    tier: 'Gold'
  },
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

function PartyProfile({ party: passedParty, onMemberClick, onOpenComments }) {
  // Merge passed party with defaults for missing properties
  const party = { ...mockParty, ...passedParty }

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedRace, setSelectedRace] = useState('Best Party') // currently selected race filter
  const [isFollowing, setIsFollowing] = useState(party.isFollowing)
  const [isFavorited, setIsFavorited] = useState(party.isFavorited)
  const [hasJoined, setHasJoined] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditBio, setShowEditBio] = useState(false)
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [cpCardExpanded, setCpCardExpanded] = useState(false)

  // Get all posts for this party (either passed or empty)
  const allPosts = party.posts || []

  // Handle post click to open SinglePostView
  const handlePostClick = (index) => {
    setSelectedPostIndex(index)
    setShowSinglePost(true)
  }

  // Profile sections state for icebreakers (with mock data)
  const [profileSections, setProfileSections] = useState({
    viewsOnIce: null,
    viewsOnTransRights: null,
    viewsOnHealthcare: null,
    viewsOnGunControl: null,
    hillToDieOn: null,
    topicsThatEnergize: { tags: ['Healthcare', 'Trans Rights', 'Climate', 'Voting Rights', 'Housing'] },
    accomplishment: null,
    guessWhichTrue: {
      options: ['I once met AOC at a coffee shop', 'I have a pet iguana named Bernie', 'I volunteered for 3 different campaigns in 2020'],
      correctIndex: 2
    },
    customWritten: [
      { prompt: 'The hill I will die on', response: 'Healthcare is a human right and should be accessible to everyone regardless of income.' },
      { prompt: 'One accomplishment I\'m proud of', response: 'Successfully organized a community rally that brought together over 500 people to advocate for local housing reform.' },
    ],
    customSliders: [
      { prompt: 'My views on trans rights', value: 8 },
      { prompt: 'My views on ICE', value: 3 },
      { prompt: 'My views on healthcare', value: 9 },
      { prompt: 'My views on gun control', value: 2 },
    ],
  })

  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)

  // Build unified icebreakers array for drag-and-drop ordering
  const buildIcebreakersArray = (sections) => {
    const items = []
    sections.customWritten?.forEach((item, index) => {
      items.push({ type: 'written', index, data: item, id: `written-${index}` })
    })
    sections.customSliders?.forEach((item, index) => {
      items.push({ type: 'slider', index, data: item, id: `slider-${index}` })
    })
    if (sections.topicsThatEnergize?.tags?.length > 0) {
      items.push({ type: 'tags', index: 0, data: sections.topicsThatEnergize, id: 'tags-0' })
    }
    if (sections.guessWhichTrue?.options?.some(o => o?.trim())) {
      items.push({ type: 'game', index: 0, data: sections.guessWhichTrue, id: 'game-0' })
    }
    return items
  }

  const [icebreakersOrder, setIcebreakersOrder] = useState(() =>
    buildIcebreakersArray(profileSections).map(item => item.id)
  )

  // Get ordered icebreakers based on current order
  const getOrderedIcebreakers = () => {
    const items = buildIcebreakersArray(profileSections)
    const itemMap = {}
    items.forEach(item => { itemMap[item.id] = item })

    const ordered = icebreakersOrder
      .filter(id => itemMap[id])
      .map(id => itemMap[id])

    items.forEach(item => {
      if (!icebreakersOrder.includes(item.id)) {
        ordered.push(item)
      }
    })

    return ordered
  }

  // Drag handlers
  const handleDragStart = (e, itemId) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragOver = (e, itemId) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== itemId) {
      setDragOverItem(itemId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const newOrder = [...icebreakersOrder]
    const draggedIndex = newOrder.indexOf(draggedItem)
    const targetIndex = newOrder.indexOf(targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setIcebreakersOrder(newOrder)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Handle save from EditBio
  const handleSaveProfile = (data) => {
    const newSections = { ...profileSections }

    if (data.viewsOnIce !== null) {
      newSections.viewsOnIce = { score: data.viewsOnIce }
    }
    if (data.viewsOnTransRights !== null) {
      newSections.viewsOnTransRights = { score: data.viewsOnTransRights }
    }
    if (data.viewsOnHealthcare !== null) {
      newSections.viewsOnHealthcare = { score: data.viewsOnHealthcare }
    }
    if (data.viewsOnGunControl !== null) {
      newSections.viewsOnGunControl = { score: data.viewsOnGunControl }
    }
    if (data.hillToDieOn?.trim()) {
      newSections.hillToDieOn = { content: data.hillToDieOn }
    }
    if (data.topicsThatEnergize?.length > 0) {
      newSections.topicsThatEnergize = { tags: data.topicsThatEnergize }
    }
    if (data.accomplishment?.trim()) {
      newSections.accomplishment = { content: data.accomplishment }
    }
    if (data.guessWhichTrue?.options?.some(o => o?.trim()) && data.guessWhichTrue?.correctIndex !== null) {
      newSections.guessWhichTrue = data.guessWhichTrue
    }
    // Handle custom icebreakers
    if (data.customWritten) {
      newSections.customWritten = data.customWritten
    }
    if (data.customSliders) {
      newSections.customSliders = data.customSliders
    }

    setProfileSections(newSections)
    setShowEditBio(false)
  }

  const partyColor = party.color || getPartyColor(party.name)

  // Get color from gradient based on position (0-10 score)
  // Matches slider gradient: #FF2A55 (red) -> #8C2AFF (purple) -> #00F2EA (cyan)
  const getScoreColor = (score) => {
    const position = score / 10 // 0 to 1
    if (position <= 0.5) {
      // Interpolate between #FF2A55 (red) and #8C2AFF (purple)
      const t = position * 2
      const r = Math.round(255 + (140 - 255) * t)
      const g = Math.round(42 + (42 - 42) * t)
      const b = Math.round(85 + (255 - 85) * t)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      // Interpolate between #8C2AFF (purple) and #00F2EA (cyan)
      const t = (position - 0.5) * 2
      const r = Math.round(140 + (0 - 140) * t)
      const g = Math.round(42 + (242 - 42) * t)
      const b = Math.round(255 + (234 - 255) * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  const tabs = [
    { name: 'Bio', icon: '/icons/profile/userprofile/bio-icon.svg' },
    { name: 'Posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
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
        {/* Posts Tab Content */}
        {activeTab === 'posts' && (
          <div className="party-posts-grid">
            {allPosts.length > 0 ? (
              allPosts.map((post, index) => (
                <div
                  key={post.id || index}
                  className="party-post-item"
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
                    <img src={post.thumbnail || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop'} alt={`Post ${index + 1}`} />
                  )}
                </div>
              ))
            ) : (
              <div className="party-posts-empty">
                <p>No posts yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'posts' && (
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

        {/* CoolPeople Points Card */}
        {(() => {
          // Get race-specific data
          const currentRaceData = raceData[selectedRace] || raceData['Best Party']
          const cpPoints = currentRaceData.cpPoints
          const raceChange = currentRaceData.change
          const currentTier = getCurrentTier(cpPoints)
          const nextTier = getNextTier(cpPoints)

          // Calculate progress to next tier
          const tierRange = (nextTier?.min || currentTier.max + 1) - currentTier.min
          const progressInTier = cpPoints - currentTier.min
          const progressPercent = Math.min((progressInTier / tierRange) * 100, 100)
          const pointsToNext = nextTier ? nextTier.min - cpPoints : 0

          // Get tier percentile (mock for now)
          const tierPercentile = currentTier.name === 'Gold' ? '3' :
                                 currentTier.name === 'Diamond' ? '1' :
                                 currentTier.name === 'Silver' ? '15' :
                                 currentTier.name === 'Bronze' ? '40' :
                                 currentTier.name === 'Master' ? '0.5' : '0.1'

          return (
            <div className={`cp-card ${cpCardExpanded ? 'expanded' : 'minimized'}`} onClick={() => setCpCardExpanded(!cpCardExpanded)}>
              {/* Header - only in expanded mode */}
              {cpCardExpanded && (
                <div className="cp-header">
                  <div className="cp-level">
                    <div className="level-badge" style={{
                      background: `linear-gradient(135deg, ${currentTier.color}33, ${currentTier.color}22)`,
                      borderColor: `${currentTier.color}4D`
                    }}>
                      {currentTier.icon}
                    </div>
                    <div className="level-info">
                      <h3 style={{ color: currentTier.color }}>{currentTier.name.toUpperCase()}</h3>
                      <span>Top {tierPercentile}% of parties</span>
                    </div>
                  </div>
                  <div className="cp-total">
                    <div className="points">{cpPoints.toLocaleString()} <span>CP</span></div>
                    <div className={`change ${raceChange.startsWith('-') ? 'negative' : 'positive'}`}>{raceChange} this week</div>
                  </div>
                </div>
              )}

              {/* Minimized header row - period selector + cp total inline */}
              {!cpCardExpanded && (
                <div className="cp-minimized-row">
                  <div className="period-selector" onClick={(e) => e.stopPropagation()}>
                    {['1W', '1M', '3M', 'ALL'].map((period) => (
                      <button
                        key={period}
                        className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                        onClick={() => setSelectedPeriod(period)}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                  <div className="cp-total-mini">
                    <span className="tier-icon-mini" style={{ color: currentTier.color }}>{currentTier.icon}</span>
                    <span className="points-mini">{cpPoints.toLocaleString()}</span>
                    <span className="cp-label-mini">CP</span>
                    <span className={`change-mini ${raceChange.startsWith('-') ? 'negative' : 'positive'}`}>{raceChange}</span>
                  </div>
                </div>
              )}

              {/* Time Period Selector - only in expanded mode */}
              {cpCardExpanded && (
                <div className="period-selector" onClick={(e) => e.stopPropagation()}>
                  {['1W', '1M', '3M', 'ALL'].map((period) => (
                    <button
                      key={period}
                      className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                      onClick={() => setSelectedPeriod(period)}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}

              {/* Chart */}
              {(() => {
                // Generate different data based on selected period
                const periodConfig = {
                  '1W': { dataPoints: 7, volatility: 0.02, changeMultiplier: 1 },
                  '1M': { dataPoints: 30, volatility: 0.03, changeMultiplier: 4 },
                  '3M': { dataPoints: 90, volatility: 0.05, changeMultiplier: 12 },
                  'ALL': { dataPoints: 180, volatility: 0.08, changeMultiplier: 24 },
                }
                const config = periodConfig[selectedPeriod]

                // Calculate period-specific change
                const baseChange = parseFloat(raceChange)
                const periodChange = baseChange * config.changeMultiplier
                const isNegativeChange = periodChange < 0

                // Get current and next tier for chart bounds
                const tierMin = currentTier.min
                const tierMax = nextTier ? nextTier.min : currentTier.max
                const fullTierRange = tierMax - tierMin

                // Generate CP history data based on period - jagged like real charts
                const generateCPHistory = () => {
                  const currentCP = cpPoints
                  const history = []
                  const startCP = currentCP - periodChange

                  // Use seeded random for consistent results
                  const seededRandom = (seed) => {
                    const x = Math.sin(seed * 9999) * 10000
                    return x - Math.floor(x)
                  }

                  for (let i = 0; i < config.dataPoints; i++) {
                    const progress = i / (config.dataPoints - 1)
                    const baseValue = startCP + (currentCP - startCP) * progress

                    // Jagged noise - random ups and downs
                    const rand1 = (seededRandom(i * 13.7) - 0.5) * 2
                    const rand2 = (seededRandom(i * 7.3 + 100) - 0.5) * 2
                    const spike = seededRandom(i * 3.1) > 0.85 ? (seededRandom(i * 2.1) - 0.5) * 4 : 0

                    const noise = (rand1 * fullTierRange * config.volatility) +
                                  (rand2 * fullTierRange * config.volatility * 0.5) +
                                  (spike * fullTierRange * config.volatility)

                    const value = baseValue + noise * (1 - progress * 0.2)
                    history.push(value)
                  }
                  history[history.length - 1] = currentCP
                  return history
                }

                const cpHistory = generateCPHistory()

                // Calculate zoomed view bounds based on actual data range
                const dataMin = Math.min(...cpHistory)
                const dataMax = Math.max(...cpHistory)
                const dataPadding = (dataMax - dataMin) * 0.1

                // Chart bounds: zoom to data range for detail
                const chartBottom = Math.min(dataMin - dataPadding, tierMin)
                const chartTop = Math.max(dataMax + dataPadding, cpPoints + 200)
                const chartRange = chartTop - chartBottom

                // Convert CP value to Y position (for data and interval lines)
                const cpToY = (cp) => {
                  return 90 - ((cp - chartBottom) / chartRange) * 75
                }

                // Next tier (goal) is always fixed at top regardless of scale
                const goalLineY = 8

                // Generate interval lines between tiers
                const generateIntervalLines = () => {
                  const lines = []
                  // Determine good interval based on tier range
                  let interval
                  if (fullTierRange <= 1000) interval = 250
                  else if (fullTierRange <= 2500) interval = 500
                  else if (fullTierRange <= 5000) interval = 500
                  else interval = 1000

                  // Start from tier min, go up in intervals
                  let value = Math.ceil(chartBottom / interval) * interval
                  while (value <= chartTop) {
                    // Skip if too close to tier boundaries
                    if (Math.abs(value - tierMin) > interval * 0.3 &&
                        Math.abs(value - tierMax) > interval * 0.3) {
                      lines.push(value)
                    }
                    value += interval
                  }
                  return lines
                }

                const intervalLines = generateIntervalLines()
                const lastY = cpToY(cpPoints)

                // Format values for labels
                const formatValue = (val) => {
                  if (val >= 1000) {
                    const k = val / 1000
                    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
                  }
                  return val.toString()
                }

                return (
                  <div className="chart-area">
                    <svg className="chart-svg" viewBox="0 0 340 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradientGreenParty" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)"/>
                          <stop offset="100%" stopColor="rgba(16, 185, 129, 0)"/>
                        </linearGradient>
                        <linearGradient id="chartGradientRedParty" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)"/>
                          <stop offset="100%" stopColor="rgba(239, 68, 68, 0)"/>
                        </linearGradient>
                      </defs>

                      {/* Interval gridlines */}
                      {intervalLines.map((val) => {
                        const y = cpToY(val)
                        if (y < 5 || y > 95) return null
                        return (
                          <g key={val}>
                            <line x1="0" y1={y} x2="310" y2={y} className="interval-line"/>
                            <text x="335" y={y + 3} className="interval-label" fill="rgba(255,255,255,0.3)" textAnchor="end">
                              {formatValue(val)}
                            </text>
                          </g>
                        )
                      })}

                      {/* Tier threshold lines: current tier (bottom) and next tier (goal at top) */}
                      {cpToY(tierMin) <= 95 && cpToY(tierMin) >= 5 && (
                        <>
                          <line x1="0" y1={cpToY(tierMin)} x2="310" y2={cpToY(tierMin)} className="tier-threshold-line current" stroke={currentTier.color}/>
                          <text x="335" y={cpToY(tierMin) + 3} className="tier-label" fill={currentTier.color} textAnchor="end">
                            {formatValue(tierMin)}
                          </text>
                        </>
                      )}
                      {/* Goal line - always fixed at top */}
                      {nextTier && (
                        <>
                          <line x1="0" y1={goalLineY} x2="310" y2={goalLineY} className="tier-threshold-line next goal" stroke={nextTier.color}/>
                          <text x="335" y={goalLineY + 3} className="tier-label" fill={nextTier.color} textAnchor="end">
                            {formatValue(tierMax)}
                          </text>
                        </>
                      )}

                      {/* Area fill - convert CP history to path */}
                      {(() => {
                        const points = cpHistory.map((cp, i) => {
                          const x = (i / (cpHistory.length - 1)) * 340
                          const y = cpToY(cp)
                          return `${x},${y}`
                        })
                        const linePath = `M${points.join(' L')}`
                        const areaPath = `${linePath} L340,100 L0,100 Z`
                        const pointColor = isNegativeChange ? '#ef4444' : '#10b981'
                        return (
                          <>
                            <path className={`chart-area-fill ${isNegativeChange ? 'negative' : 'positive'}`} d={areaPath} fill={isNegativeChange ? 'url(#chartGradientRedParty)' : 'url(#chartGradientGreenParty)'}/>
                            <path className={`chart-line ${isNegativeChange ? 'negative' : 'positive'}`} d={linePath}/>
                            {/* Current point indicator */}
                            <circle cx="340" cy={lastY} r="5" fill={pointColor}/>
                            <circle cx="340" cy={lastY} r="8" fill="none" stroke={pointColor} strokeWidth="2" opacity="0.3"/>
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                )
              })()}

              {/* Progress to Next Level - only in expanded mode */}
              {cpCardExpanded && nextTier && (
                <div className="progress-section">
                  <div className="progress-header">
                    <div className="current" style={{ color: currentTier.color }}>
                      <span className="icon">{currentTier.icon}</span>
                      {currentTier.name}
                    </div>
                    <div className="next">{pointsToNext.toLocaleString()} CP to {nextTier.icon} {nextTier.name}</div>
                  </div>
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    <span>{currentTier.min.toLocaleString()} CP</span>
                    <span>{nextTier.min.toLocaleString()} CP</span>
                  </div>
                </div>
              )}

            </div>
          )
        })()}

        {/* Race Pills - only show if party is in 2+ races */}
        {party.races && party.races.length > 1 && (
          <div className="tag-pills-container">
            <div className="tag-pills">
              {party.races.map((race) => (
                <button
                  key={race}
                  className={`tag-pill ${selectedRace === race ? 'active' : ''}`}
                  onClick={() => setSelectedRace(race)}
                >
                  {race}
                </button>
              ))}
            </div>
          </div>
        )}

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

          <div className="chart-rating-badge below-verified">
            <span className="rating-value">3.2</span>
            <div className="rating-star-circle">
              <svg className="rating-star" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
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

        {/* Profile Sections / Icebreakers */}
        {getOrderedIcebreakers().length > 0 && (
          <div className="profile-sections">
            <div className="profile-sections-header">
              <span className="profile-sections-title">Icebreakers</span>
            </div>

            {/* Render icebreakers in drag-and-drop order */}
            {getOrderedIcebreakers().map((icebreaker) => {
              const isDragOver = dragOverItem === icebreaker.id

              if (icebreaker.type === 'written') {
                return (
                  <div
                    key={icebreaker.id}
                    className={`profile-section ${isDragOver ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, icebreaker.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, icebreaker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, icebreaker.id)}
                  >
                    <div className="drag-handle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                      </svg>
                    </div>
                    <span className="section-title">{icebreaker.data.prompt.toLowerCase()}</span>
                    <p className="section-content-text">{icebreaker.data.response}</p>
                    <div className="section-footer">
                      <button className="section-like-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="section-like-count">{24 + icebreaker.index * 7}</span>
                      </button>
                    </div>
                  </div>
                )
              }

              if (icebreaker.type === 'slider') {
                return (
                  <div
                    key={icebreaker.id}
                    className={`profile-section ${isDragOver ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, icebreaker.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, icebreaker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, icebreaker.id)}
                  >
                    <div className="drag-handle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                      </svg>
                    </div>
                    <span className="section-title">{icebreaker.data.prompt.toLowerCase()}</span>
                    <div className="score-bar-container">
                      <div className="score-bar">
                        <div
                          className="score-indicator"
                          style={{
                            left: `${icebreaker.data.value * 10}%`,
                            background: getScoreColor(icebreaker.data.value)
                          }}
                        >
                          <span className="score-value">{icebreaker.data.value}</span>
                        </div>
                      </div>
                    </div>
                    <div className="section-footer">
                      <button className="section-like-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="section-like-count">{18 + icebreaker.index * 5}</span>
                      </button>
                    </div>
                  </div>
                )
              }

              if (icebreaker.type === 'tags') {
                return (
                  <div
                    key={icebreaker.id}
                    className={`profile-section ${isDragOver ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, icebreaker.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, icebreaker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, icebreaker.id)}
                  >
                    <div className="drag-handle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                      </svg>
                    </div>
                    <span className="section-title">topics that energize me</span>
                    <div className="energize-tags">
                      {icebreaker.data.tags.map((tag, i) => (
                        <span key={i} className="energize-tag">{tag}</span>
                      ))}
                    </div>
                    <div className="section-footer">
                      <button className="section-like-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="section-like-count">42</span>
                      </button>
                    </div>
                  </div>
                )
              }

              if (icebreaker.type === 'game') {
                return (
                  <div
                    key={icebreaker.id}
                    className={`profile-section ${isDragOver ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, icebreaker.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, icebreaker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, icebreaker.id)}
                  >
                    <div className="drag-handle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                      </svg>
                    </div>
                    <span className="section-title guess">Guess which one is true</span>
                    <div className="guess-options">
                      {icebreaker.data.options.map((option, i) => (
                        option && (
                          <button key={i} className="guess-bubble">
                            <span className="guess-text">{option}</span>
                          </button>
                        )
                      ))}
                    </div>
                    <div className="section-footer">
                      <button className="section-like-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="section-like-count">56</span>
                      </button>
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>
        )}
        </>
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
          <EditBio profileData={profileSections} onSave={handleSaveProfile} />
        </div>
      )}

      {/* Single Post View */}
      {showSinglePost && allPosts.length > 0 && (
        <SinglePostView
          posts={allPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setShowSinglePost(false)}
          onEndReached={() => setShowSinglePost(false)}
          onUsernameClick={onMemberClick}
          onOpenComments={onOpenComments}
          profileName={party.name}
        />
      )}
    </div>
  )
}

export default PartyProfile
