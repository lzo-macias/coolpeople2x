import { useState } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ReelCard.css'
import ReelActions from './ReelActions'
import EngagementScoreBar from './EngagementScoreBar'
import QuoteNominateScreen from './QuoteNominateScreen'
import { getPartyColor } from '../data/mockData'

// Helper to generate sparkline data
const generateSparklineData = (trend = 'up', points = 20) => {
  const data = []
  let value = 50 + Math.random() * 20
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * 15
    const trendBias = trend === 'up' ? 0.5 : trend === 'down' ? -0.5 : 0
    value = Math.max(10, Math.min(90, value + change + trendBias))
    data.push(value)
  }
  return data
}

// Mock race candidates for the chart
const raceChartData = [
  { id: 1, name: 'William H.', avatar: 'https://i.pravatar.cc/40?img=12', data: [1.2, 1.5, 1.8, 2.1, 2.4, 2.6, 2.8, 2.9, 3.0], nominations: '25,000', stars: 4.8, sparkline: generateSparklineData('up') },
  { id: 2, name: 'Sarah J.', avatar: 'https://i.pravatar.cc/40?img=5', data: [1.1, 1.3, 1.6, 1.9, 2.2, 2.4, 2.5, 2.6, 2.7], nominations: '18,500', stars: 4.5, sparkline: generateSparklineData('up') },
  { id: 3, name: 'Alex M.', avatar: 'https://i.pravatar.cc/40?img=3', data: [1.0, 1.2, 1.4, 1.7, 1.9, 2.1, 2.3, 2.4, 2.5], nominations: '15,200', stars: 4.3, sparkline: generateSparklineData('stable') },
  { id: 4, name: 'Mike T.', avatar: 'https://i.pravatar.cc/40?img=8', data: [0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.0, 2.1, 2.2], nominations: '12,800', stars: 4.1, sparkline: generateSparklineData('down') },
  { id: 5, name: 'Jordan P.', avatar: 'https://i.pravatar.cc/40?img=14', data: [0.8, 1.0, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9], nominations: '9,400', stars: 3.9, sparkline: generateSparklineData('up') },
  { id: 6, name: 'Casey R.', avatar: 'https://i.pravatar.cc/40?img=16', data: [0.7, 0.9, 1.0, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7], nominations: '7,100', stars: 3.7, sparkline: generateSparklineData('stable') },
  { id: 7, name: 'Taylor M.', avatar: 'https://i.pravatar.cc/40?img=18', data: [0.6, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5], nominations: '5,600', stars: 3.5, sparkline: generateSparklineData('down') },
  { id: 8, name: 'Morgan L.', avatar: 'https://i.pravatar.cc/40?img=20', data: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3], nominations: '3,200', stars: 3.2, sparkline: generateSparklineData('up') },
]

// Mini sparkline for contestant rows
function MiniSparkline({ data, width = 50, height = 20 }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((val, i) =>
    `${(i / (data.length - 1)) * width},${height - ((val - min) / range) * height}`
  ).join(' ')

  return (
    <svg width={width} height={height} className="mini-sparkline">
      <polyline points={points} fill="none" stroke="#E8A855" strokeWidth="1.5" />
    </svg>
  )
}

// RaceChart component with orange/gold theme - stretched
function RaceChart({ candidates, onCandidateClick }) {
  const [hoveredId, setHoveredId] = useState(null)
  const width = 380
  const height = 160
  const padding = { top: 15, right: 45, bottom: 25, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const allValues = candidates.flatMap(c => c.data)
  const minY = Math.min(...allValues) * 0.9
  const maxY = Math.max(...allValues) * 1.1
  const xLabels = ['9th', '18th', 'Today']

  const getX = (index, total) => padding.left + (index / (total - 1)) * chartWidth
  const getY = (value) => padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight

  // Orange color palette from dark to light
  const colors = [
    '#E8A855', '#D4954A', '#C08340', '#AB7135',
    '#976030', '#8A5528', '#7D4A20', '#704018'
  ]

  return (
    <svg width={width} height={height} className="race-chart-svg">
      {/* Grid lines */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="rgba(232, 168, 85, 0.2)" />
      <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="rgba(232, 168, 85, 0.2)" />

      {/* Y axis labels */}
      <text x={padding.left - 8} y={padding.top + 5} fill="#E8A855" fontSize="10" textAnchor="end">3M</text>
      <text x={padding.left - 8} y={padding.top + chartHeight / 2} fill="#E8A855" fontSize="10" textAnchor="end">2M</text>
      <text x={padding.left - 8} y={padding.top + chartHeight - 5} fill="#E8A855" fontSize="10" textAnchor="end">1M</text>

      {/* X axis labels */}
      {xLabels.map((label, i) => (
        <text key={label} x={getX(i * 4, 9)} y={height - 5} fill="#E8A855" fontSize="10" textAnchor="middle">{label}</text>
      ))}

      {/* Lines */}
      {candidates.map((candidate, idx) => {
        const points = candidate.data.map((val, i) => `${getX(i, candidate.data.length)},${getY(val)}`).join(' ')
        return (
          <polyline
            key={candidate.id}
            points={points}
            fill="none"
            stroke={colors[idx]}
            strokeWidth={idx === 0 ? 3 : 2}
            opacity={1 - idx * 0.08}
            className="race-chart-line"
            onMouseEnter={() => setHoveredId(candidate.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ cursor: 'pointer' }}
            onClick={() => onCandidateClick?.(candidate)}
          />
        )
      })}

      {/* Avatar circles at end of lines - render hovered one last so it's on top */}
      {candidates
        .map((candidate, idx) => ({ candidate, idx, isHovered: hoveredId === candidate.id }))
        .sort((a, b) => (a.isHovered ? 1 : 0) - (b.isHovered ? 1 : 0))
        .map(({ candidate, idx, isHovered }) => {
          const lastX = getX(candidate.data.length - 1, candidate.data.length)
          const lastY = getY(candidate.data[candidate.data.length - 1])
          const scale = isHovered ? 1.6 : 1
          const radius = isHovered ? 18 : 12
          const imgSize = isHovered ? 30 : 20
          const imgOffset = imgSize / 2

          return (
            <g
              key={`avatar-${candidate.id}`}
              className={`race-chart-avatar ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredId(candidate.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onCandidateClick?.(candidate)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={lastX + 18}
                cy={lastY}
                r={radius}
                fill="#2A1F0F"
                stroke={colors[idx]}
                strokeWidth={isHovered ? 3 : 2}
              />
              <clipPath id={`clip-${candidate.id}`}>
                <circle cx={lastX + 18} cy={lastY} r={radius - 2} />
              </clipPath>
              <image
                href={candidate.avatar}
                x={lastX + 18 - imgOffset}
                y={lastY - imgOffset}
                width={imgSize}
                height={imgSize}
                clipPath={`url(#clip-${candidate.id})`}
              />
              {isHovered && (
                <text
                  x={lastX + 18}
                  y={lastY + radius + 12}
                  fill="#E8A855"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {candidate.name}
                </text>
              )}
            </g>
          )
        })}
    </svg>
  )
}

// Helper to parse nomination string to number
const parseNominations = (str) => parseInt(str.replace(/,/g, ''), 10)
// Helper to format number to nomination string
const formatNominations = (num) => num.toLocaleString()

// Mock followed races for main nominate button (empty = just CoolPeople)
const mockFollowedRaces = [
  { id: 'mayor', name: 'Mayor Race', icon: 'https://i.pravatar.cc/40?img=60' },
  { id: 'council', name: 'City Council', icon: 'https://i.pravatar.cc/40?img=52' },
  { id: 'pinklady', name: 'The Pink Lady', icon: 'https://i.pravatar.cc/40?img=47' },
]

function ReelCard({ reel, isPreview = false, onOpenComments, onUsernameClick, onPartyClick, onEngagementClick }) {
  const [showRaceModal, setShowRaceModal] = useState(false)
  const [nominatedCandidates, setNominatedCandidates] = useState(new Set())
  const [nominationCounts, setNominationCounts] = useState(() => {
    const counts = {}
    raceChartData.forEach(c => {
      counts[c.id] = parseNominations(c.nominations)
    })
    return counts
  })
  const [raceFollowed, setRaceFollowed] = useState(false)
  const [raceParticipating, setRaceParticipating] = useState(false)

  // Main nominate button flow state
  const [showNominateRaceSelect, setShowNominateRaceSelect] = useState(false)
  const [showNominateOptions, setShowNominateOptions] = useState(false)
  const [selectedRaceForNomination, setSelectedRaceForNomination] = useState(null)
  const [showQuoteNominate, setShowQuoteNominate] = useState(false)
  const defaultReel = {
    id: 1,
    videoUrl: null,
    thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
    user: {
      username: 'William.H.ForMayor',
      party: 'Democrat',
      avatar: 'https://i.pravatar.cc/40?img=12',
    },
    title: 'THE BEST TEAM EVER GO TEAM TEAM',
    caption: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Building together!',
    engagementScores: [
      {
        id: 'eng-1',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=1',
        sparklineData: generateSparklineData('up'),
        recentChange: null,
      },
      {
        id: 'eng-2',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=12',
        sparklineData: generateSparklineData('down'),
        recentChange: '+1',
      },
      {
        id: 'eng-3',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=5',
        sparklineData: generateSparklineData('stable'),
        recentChange: null,
      },
    ],
    stats: {
      votes: '9,999',
      likes: '9,999',
      comments: '9,999',
      shazam: '9,999',
      shares: '9,999',
    },
    targetRace: 'Mayor Race',
  }

  const data = reel || defaultReel

  if (isPreview) {
    return (
      <div className="reel-preview">
        <div
          className="reel-preview-bg"
          style={{ backgroundImage: `url(${data.thumbnail})` }}
        />
        <div className="reel-preview-overlay">
          <div className="reel-preview-info">
            <button className="party-tag clickable" onClick={() => onPartyClick?.(data.user.party)}>
              {data.user.party}
            </button>
            <button className="username clickable" onClick={() => onUsernameClick?.(data.user)}>
              @{data.user.username}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reel-card">
      <div
        className="reel-media"
        style={{ backgroundImage: `url(${data.thumbnail})` }}
      />

      <div className="reel-overlay">
        {/* Top engagement sparkline charts */}
        <EngagementScoreBar scores={data.engagementScores} onItemClick={onEngagementClick} />

        {/* Right side actions */}
        <div className="reel-actions-container">
          <ReelActions user={data.user} stats={data.stats} onOpenComments={onOpenComments} />
        </div>

        {/* Bottom info */}
        <div className="reel-bottom">
          <div className="reel-info">
            {data.targetRace && (
              <button className="reel-target-pill" onClick={() => setShowRaceModal(true)}>
                <span className="target-pill-dot"></span>
                {data.targetRace}
              </button>
            )}
            <div className="reel-user-row">
              <img
                src={data.user.avatar}
                alt={data.user.username}
                className="reel-user-avatar clickable"
                style={{ borderColor: getPartyColor(data.user.party) }}
                onClick={() => onUsernameClick?.(data.user)}
              />
              <div className="reel-user-details">
                <button className="party-tag clickable" onClick={() => onPartyClick?.(data.user.party)}>
                  {data.user.party}
                </button>
                <button className="username clickable" onClick={() => onUsernameClick?.(data.user)}>
                  {data.user.username}
                </button>
              </div>
            </div>
            <p className="reel-title">{data.title}</p>
            <p className="reel-caption">{data.caption}</p>
          </div>
          <button
            className="nominate-btn"
            onClick={() => {
              if (mockFollowedRaces.length === 0) {
                // No followed races, nominate directly to CoolPeople
                // TODO: handle direct nomination
              } else {
                // Has followed races, show race selection
                setShowNominateRaceSelect(true)
              }
            }}
          >
            <span>Nominate</span>
          </button>
        </div>
      </div>

      {/* Race Slide-up Modal */}
      {showRaceModal && createPortal(
        <>
          <div className="race-modal-backdrop" onClick={() => setShowRaceModal(false)} />
          <div className="race-modal">
            <div className="race-modal-handle" />
            <div className="race-modal-header">
              <div className="race-modal-title-row">
                <h2 className="race-modal-title">{data.targetRace}</h2>
                <div className="race-modal-actions">
                  <button
                    className={`race-modal-btn follow ${raceFollowed ? 'checked' : ''}`}
                    onClick={() => {
                      setRaceFollowed(true)
                      setTimeout(() => setShowRaceModal(false), 400)
                    }}
                  >
                    {raceFollowed ? '✓' : 'Follow'}
                  </button>
                  <button
                    className={`race-modal-btn participate ${raceParticipating ? 'checked' : ''}`}
                    onClick={() => {
                      setRaceParticipating(true)
                      setTimeout(() => setShowRaceModal(false), 400)
                    }}
                  >
                    {raceParticipating ? '✓' : 'Participate'}
                  </button>
                </div>
              </div>
            </div>
            <div className="race-modal-chart">
              <RaceChart
                candidates={raceChartData}
                onCandidateClick={(candidate) => onUsernameClick?.({
                  username: candidate.name,
                  avatar: candidate.avatar,
                  party: 'Independent'
                })}
              />
            </div>
            <div className="race-contestants-list">
              {raceChartData.map((candidate, idx) => {
                const isNominated = nominatedCandidates.has(candidate.id)
                return (
                  <div
                    key={candidate.id}
                    className="race-contestant-row"
                    onClick={() => onUsernameClick?.({
                      username: candidate.name,
                      avatar: candidate.avatar,
                      party: 'Independent'
                    })}
                  >
                    <span className="race-contestant-rank">{idx + 1}</span>
                    <img src={candidate.avatar} alt={candidate.name} className="race-contestant-avatar" />
                    <div className="race-contestant-info">
                      <span className="race-contestant-name">{candidate.name}</span>
                      <span className="race-contestant-nominations">{formatNominations(nominationCounts[candidate.id])} nominations</span>
                    </div>
                    <div className="race-contestant-stats">
                      <div className="race-contestant-stars">
                        <span className="star-icon">★</span>
                        <span>{candidate.stars}</span>
                      </div>
                      <MiniSparkline data={candidate.sparkline} />
                    </div>
                    <button
                      className={`race-nominate-btn ${isNominated ? 'nominated' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const wasNominated = nominatedCandidates.has(candidate.id)
                        setNominatedCandidates(prev => {
                          const next = new Set(prev)
                          if (next.has(candidate.id)) {
                            next.delete(candidate.id)
                          } else {
                            next.add(candidate.id)
                          }
                          return next
                        })
                        setNominationCounts(prev => ({
                          ...prev,
                          [candidate.id]: prev[candidate.id] + (wasNominated ? -1 : 1)
                        }))
                      }}
                    >
                      {isNominated ? '✓' : '+'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Race Selection Slide-up for main Nominate button */}
      {showNominateRaceSelect && createPortal(
        <>
          <div className="nominate-modal-backdrop" onClick={() => setShowNominateRaceSelect(false)} />
          <div className="nominate-modal race-select">
            <div className="nominate-modal-handle" />
            <h3 className="nominate-modal-title">Select a Race</h3>
            <div className="nominate-race-list">
              {/* Current race from pill */}
              {data.targetRace && (
                <button
                  className="nominate-race-item"
                  onClick={() => {
                    setSelectedRaceForNomination({ id: 'current', name: data.targetRace })
                    setShowNominateRaceSelect(false)
                    setShowNominateOptions(true)
                  }}
                >
                  <span className="nominate-race-dot"></span>
                  <span className="nominate-race-name">{data.targetRace}</span>
                  <span className="nominate-race-tag">Current</span>
                </button>
              )}
              {/* Followed races */}
              {mockFollowedRaces.map(race => (
                <button
                  key={race.id}
                  className="nominate-race-item"
                  onClick={() => {
                    setSelectedRaceForNomination(race)
                    setShowNominateRaceSelect(false)
                    setShowNominateOptions(true)
                  }}
                >
                  <img src={race.icon} alt={race.name} className="nominate-race-icon" />
                  <span className="nominate-race-name">{race.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Quote or Nominate Options Slide-up */}
      {showNominateOptions && createPortal(
        <>
          <div className="nominate-modal-backdrop" onClick={() => {
            setShowNominateOptions(false)
            setSelectedRaceForNomination(null)
          }} />
          <div className="nominate-modal nominate-options">
            <div className="nominate-modal-handle" />
            <h3 className="nominate-modal-title">
              Nominate @{data.user.username} to {selectedRaceForNomination?.name}
            </h3>
            <div className="nominate-options-list">
              <button
                className="nominate-option-btn quote"
                onClick={() => {
                  setShowNominateOptions(false)
                  setShowQuoteNominate(true)
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>Quote & Nominate</span>
                <span className="nominate-option-desc">Add a message with your nomination</span>
              </button>
              <button
                className="nominate-option-btn nominate"
                onClick={() => {
                  // TODO: Handle direct nomination
                  setShowNominateOptions(false)
                  setSelectedRaceForNomination(null)
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Nominate</span>
                <span className="nominate-option-desc">Quick nomination without message</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Quote Nominate Screen */}
      {showQuoteNominate && (
        <QuoteNominateScreen
          reel={data}
          selectedRace={selectedRaceForNomination}
          onClose={() => {
            setShowQuoteNominate(false)
            setSelectedRaceForNomination(null)
          }}
          onComplete={() => {
            setShowQuoteNominate(false)
            setSelectedRaceForNomination(null)
          }}
        />
      )}
    </div>
  )
}

export default ReelCard
