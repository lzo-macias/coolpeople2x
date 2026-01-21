import { useState } from 'react'
import '../styling/ParticipantProfile.css'
import { getPartyColor } from '../data/mockData'
import EditBio from './EditBio'

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

// Mock data for the participant profile
const mockParticipant = {
  id: 'user-1',
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: null, // null = Independent, or party name like 'The Pink Lady'
  nominations: '9,999',
  followers: '1M',
  cpPoints: 1850, // CoolPeople points
  ranking: '.3%',
  isFollowing: false,
  isFavorited: false,
  hasOptedIn: true, // whether they've opted into social credit
  bio: 'Building connections. Making a difference in our community.',
  // Races the user participates in (CP is always included for opted-in users)
  races: ['CP', 'NYC Mayor 2024'],
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

// Race data for CP filtering - user-specific performance
const raceData = {
  'CP': {
    cpPoints: 1850,
    change: '+42.30',
    tier: 'Silver'
  },
  'NYC Mayor 2024': {
    cpPoints: 890,
    change: '+15.20',
    tier: 'Bronze'
  },
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
  const [selectedRace, setSelectedRace] = useState('CP') // currently selected race filter
  const [isFollowing, setIsFollowing] = useState(participant.isFollowing)
  const [isFavorited, setIsFavorited] = useState(participant.isFavorited)
  const [showEditBio, setShowEditBio] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [cpCardExpanded, setCpCardExpanded] = useState(false)

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
        {/* Dev edit button */}
        <button
          className="dev-edit-btn"
          onClick={() => setShowEditBio(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
                <span className="stat-number">{participant.races?.length || '8'}</span>
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

        {activeTab === 'tags' && participant.hasOptedIn && (
          <>
            {/* CoolPeople Points Card */}
            {(() => {
              // Get race-specific data
              const currentRaceData = raceData[selectedRace] || raceData['CP']
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
                          <span>Top {tierPercentile}% of users</span>
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
                            <linearGradient id="chartGradientGreenPart" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)"/>
                              <stop offset="100%" stopColor="rgba(16, 185, 129, 0)"/>
                            </linearGradient>
                            <linearGradient id="chartGradientRedPart" x1="0" y1="0" x2="0" y2="1">
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
                                <path className={`chart-area-fill ${isNegativeChange ? 'negative' : 'positive'}`} d={areaPath} fill={isNegativeChange ? 'url(#chartGradientRedPart)' : 'url(#chartGradientGreenPart)'}/>
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

            {/* Race Pills - only show if user is in 2+ races */}
            {participant.races && participant.races.length > 1 && (
              <div className="tag-pills-container">
                <div className="tag-pills">
                  {participant.races.map((race) => (
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
          </>
        )}

        {activeTab === 'tags' && !participant.hasOptedIn && (
          <div className="tags-placeholder">
            <p>Opt in to social credit to see your CP stats</p>
          </div>
        )}

        {activeTab === 'bio' && (
          <div className="bio-placeholder">
            <p>Bio content coming soon...</p>
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
    </div>
  )
}

export default ParticipantProfile
