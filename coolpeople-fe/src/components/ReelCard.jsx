import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ReelCard.css'
import ReelActions from './ReelActions'
import EngagementScoreBar from './EngagementScoreBar'
import QuoteNominateScreen from './QuoteNominateScreen'
import { getPartyColor } from '../data/mockData'
import { racesApi, reelsApi } from '../services/api'

// Helper to format points for display (e.g., 25000 -> "25,000")
const formatPoints = (points) => {
  if (!points && points !== 0) return '0'
  return points.toLocaleString()
}

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

// Default race for nominations
const DEFAULT_RACE = { id: 'coolpeople', name: 'CoolPeople', icon: '/coolpeople-icon.png' }

function ReelCard({ reel, isPreview = false, isPageActive = true, onOpenComments, onUsernameClick, onPartyClick, onEngagementClick, onTrackActivity, onLikeChange, onRepostChange, onHide, userRacesFollowing = [], hasOptedIn = false, onOptIn }) {
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  // IntersectionObserver to detect when video is in viewport
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.5)
      },
      { threshold: 0.5 }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  // Helper to pause video when navigating away
  const pauseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  // Helper to resume video when returning from modals
  const resumeVideo = () => {
    if (videoRef.current && isPageActive) {
      videoRef.current.play().catch(() => {})
    }
  }

  // Play/pause video based on visibility and page active state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isVisible && isPageActive) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isVisible, isPageActive])

  // Race modal state
  const [showRaceModal, setShowRaceModal] = useState(false)
  const [nominatedCandidates, setNominatedCandidates] = useState(new Set())
  const [nominationCounts, setNominationCounts] = useState({})
  const [raceFollowed, setRaceFollowed] = useState(false)
  const [raceParticipating, setRaceParticipating] = useState(false)
  const [raceScoreboard, setRaceScoreboard] = useState([])
  const [raceDetails, setRaceDetails] = useState(null)
  const [showOptInConfirm, setShowOptInConfirm] = useState(false)

  // Record view when reel becomes visible (only for valid UUIDs, not temp IDs)
  useEffect(() => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (isVisible && reel?.id && uuidPattern.test(reel.id)) {
      const recordView = async () => {
        try {
          await reelsApi.recordView(reel.id, { watchPercent: 0 })
        } catch (error) {
          // Silent fail for view tracking
        }
      }
      recordView()
    }
  }, [isVisible, reel?.id])

  // Fetch race details, scoreboard, and boost status when race modal opens
  useEffect(() => {
    const fetchRaceData = async () => {
      if (!showRaceModal || !reel?.targetRace) return
      try {
        // Find race by name
        const racesResponse = await racesApi.listRaces()
        const race = racesResponse.data?.find(r => r.title === reel.targetRace)
        if (race) {
          // Store race details (including endDate, isFollowing, isCompeting)
          setRaceDetails(race)
          setRaceFollowed(race.isFollowing || false)
          setRaceParticipating(race.isCompeting || false)

          // Fetch scoreboard and boost status in parallel
          const [scoreboardResponse, boostStatusResponse] = await Promise.all([
            racesApi.getScoreboard(race.id, { period: '7d' }),
            racesApi.getBoostStatus(race.id).catch(() => ({ data: { boostedUserIds: [], boostedPartyIds: [] } }))
          ])

          if (scoreboardResponse.data) {
            const scoreboard = scoreboardResponse.data.map((entry) => {
              // Handle both user races and party races
              const isPartyEntry = !entry.user && entry.party
              const entityId = isPartyEntry ? entry.party?.id : entry.user?.id || entry.id
              const entityName = isPartyEntry
                ? entry.party?.name
                : (entry.user?.displayName || entry.user?.username || 'Unknown')
              const entityHandle = isPartyEntry ? entry.party?.handle : entry.user?.username
              const entityAvatar = isPartyEntry
                ? (entry.party?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.party?.name || 'P')}&background=random`)
                : (entry.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.user?.username || 'U')}&background=random`)

              return {
                id: entityId,
                username: entityHandle || 'unknown',
                name: entityName,
                avatar: entityAvatar,
                data: entry.sparkline?.map(s => s.points) || [0],
                totalPoints: entry.totalPoints || 0,
                rank: entry.rank,
                tier: entry.tier,
                sparkline: entry.sparkline?.map(s => s.points) || [0],
                change: entry.change || 0,
                isPartyEntry, // Track whether this is a party entry for navigation
                partyName: isPartyEntry ? entry.party?.name : null,
              }
            })
            setRaceScoreboard(scoreboard)
            // Initialize nomination counts from totalPoints
            const counts = {}
            scoreboard.forEach(c => {
              counts[c.id] = c.totalPoints
            })
            setNominationCounts(counts)

            // Pre-populate nominatedCandidates from boost status
            const boostData = boostStatusResponse.data || boostStatusResponse
            const boostedIds = new Set([
              ...(boostData.boostedUserIds || []),
              ...(boostData.boostedPartyIds || [])
            ])
            setNominatedCandidates(boostedIds)

            // Check if the reel's poster (user or party) is in the boosted list
            const posterId = data.isPartyPost ? data.partyId : data.user?.id
            if (posterId && boostedIds.has(posterId)) {
              setHasNominatedPoster(true)
            }
          }
        }
      } catch (error) {
        console.log('Error fetching race data:', error.message)
      }
    }
    fetchRaceData()
  }, [showRaceModal, reel?.targetRace])

  // Fetch boost status on mount for the main Nominate button (if reel has targetRace)
  useEffect(() => {
    const fetchInitialBoostStatus = async () => {
      if (!reel?.targetRace) return
      try {
        // Find race by name
        const racesResponse = await racesApi.listRaces()
        const race = racesResponse.data?.find(r => r.title === reel.targetRace)
        if (race) {
          setRaceDetails(race)
          const boostStatusResponse = await racesApi.getBoostStatus(race.id).catch(() => ({ data: { boostedUserIds: [], boostedPartyIds: [] } }))
          const boostData = boostStatusResponse.data || boostStatusResponse

          // Check if the reel's poster (user or party) is already boosted
          const posterId = data.isPartyPost ? data.partyId : data.user?.id
          if (posterId) {
            const boostedIds = [...(boostData.boostedUserIds || []), ...(boostData.boostedPartyIds || [])]
            if (boostedIds.includes(posterId)) {
              setHasNominatedPoster(true)
            }
          }
        }
      } catch (error) {
        // Silent fail - don't block the UI
      }
    }
    fetchInitialBoostStatus()
  }, [reel?.id, reel?.targetRace])

  // Race deadline from real data or fallback
  const raceDeadline = raceDetails?.endDate ? new Date(raceDetails.endDate) : null

  // Live countdown state
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Update countdown every second (only if we have a deadline)
  useEffect(() => {
    if (!raceDeadline) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      return
    }

    const calculateTimeRemaining = () => {
      const now = new Date()
      const diff = raceDeadline - now
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      return { days, hours, minutes, seconds }
    }

    setTimeRemaining(calculateTimeRemaining())
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [raceDeadline])

  // Main nominate button flow state
  const [showNominateRaceSelect, setShowNominateRaceSelect] = useState(false)
  const [hasNominatedPoster, setHasNominatedPoster] = useState(false)

  // Play nomination sound
  const playNominateSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }
  const [showNominateOptions, setShowNominateOptions] = useState(false)
  const [selectedRaceForNomination, setSelectedRaceForNomination] = useState(null)
  const [showQuoteNominate, setShowQuoteNominate] = useState(false)
  const [showQuoteRepost, setShowQuoteRepost] = useState(false)
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
        sparklineData: [],
        recentChange: null,
      },
      {
        id: 'eng-2',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=12',
        sparklineData: [],
        recentChange: '+1',
      },
      {
        id: 'eng-3',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=5',
        sparklineData: [],
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
  // Party-only post: isPartyPost flag is explicitly true
  const isPartyPost = data.isPartyPost === true
  // Both-feeds post: has partyId but not party-only (shows in both user and party feeds)
  const isBothFeedsPost = !isPartyPost && (!!data.partyId || !!data.party)
  // For party posts from API, use party identity; for local posts, user is already set to party
  const partyName = data.party?.name || data.user?.party
  const partyAvatar = (data.party?.avatarUrl) || data.user?.avatar || 'https://i.pravatar.cc/40?img=1'

  if (isPreview) {
    return (
      <div className="reel-preview">
        <div
          className="reel-preview-bg"
          style={{ backgroundImage: `url(${data.thumbnail})` }}
        />
        <div className="reel-preview-overlay">
          <div className="reel-preview-info">
            {isPartyPost ? (
              <button className="party-tag clickable" onClick={() => { pauseVideo(); onPartyClick?.(partyName) }}>
                {partyName}
              </button>
            ) : (
              <>
                {data.user?.party ? (
                  <button className="party-tag clickable" onClick={() => { pauseVideo(); onPartyClick?.(data.user?.party) }}>
                    {data.user?.party}
                  </button>
                ) : (
                  <span className="party-tag">Independent</span>
                )}
                <button className="username clickable" onClick={() => { pauseVideo(); onUsernameClick?.(data.user) }}>
                  @{data.user?.username || 'unknown'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reel-card" ref={cardRef}>
      {data.videoUrl ? (
        <video
          ref={videoRef}
          src={data.videoUrl}
          className={`reel-media-video ${data.isMirrored ? 'mirrored' : ''}`}
          loop
          playsInline
          onError={(e) => console.error('Video error:', e, 'src:', data.videoUrl)}
          onLoadedData={() => console.log('Video loaded:', data.videoUrl)}
        />
      ) : (
        <div
          className="reel-media"
          style={{ backgroundImage: `url(${data.thumbnail})` }}
        />
      )}

      <div className="reel-overlay">
        {/* Top engagement sparkline charts */}
        <EngagementScoreBar scores={data.engagementScores} raceName={data.targetRace || data.engagementRaceName || 'CoolPeople'} onItemClick={(score) => { pauseVideo(); onEngagementClick?.(score) }} />

        {/* Right side actions */}
        <div className="reel-actions-container">
          <ReelActions
            user={data.user}
            stats={data.stats}
            onOpenComments={onOpenComments}
            onTrackActivity={onTrackActivity}
            reel={data}
            onLikeChange={onLikeChange}
            onRepostChange={(reelId, isReposted) => {
              console.log('[REPOST-REELCARD] Passing to parent:', { reelId, isReposted, hasOnRepostChange: !!onRepostChange })
              onRepostChange?.(reelId, isReposted)
            }}
            onHide={onHide}
            isPageActive={isPageActive}
            onOpenQuote={() => {
              pauseVideo()
              setShowQuoteRepost(true)
            }}
          />
        </div>

        {/* Bottom info */}
        <div className="reel-bottom">
          <div className="reel-info">
            {/* Reposted by indicator */}
            {data.repostedBy && (
              <button
                className="reposted-by-indicator"
                onClick={() => { pauseVideo(); onUsernameClick?.(data.repostedBy) }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span>Reposted by @{data.repostedBy.username || data.repostedBy.displayName}</span>
              </button>
            )}

            {/* Activity label indicator */}
            {data.activityLabel && (
              <div className="activity-label-indicator">
                <span className="activity-label-icon" style={{ color: data.activityLabel.color }}>{data.activityLabel.icon}</span>
                <span className="activity-label-text">
                  {data.activityLabel.actor?.username || 'You'} {data.activityLabel.text}
                </span>
              </div>
            )}

            {/* Race Target Pill - opens race modal */}
            {data.targetRace && (
              <button
                className="reel-target-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  pauseVideo();
                  setShowRaceModal(true);
                }}
              >
                <span className="target-pill-dot"></span>
                {data.targetRace}
              </button>
            )}
            <div className="reel-user-row">
              {isPartyPost ? (
                // Party-only post: show party identity
                <>
                  <img
                    src={partyAvatar}
                    alt={partyName || 'party'}
                    className="reel-user-avatar clickable"
                    style={{ borderColor: getPartyColor(partyName) }}
                    onClick={() => { pauseVideo(); onPartyClick?.(partyName) }}
                  />
                  <div className="reel-user-details">
                    <button className="party-tag clickable" onClick={() => { pauseVideo(); onPartyClick?.(partyName) }}>
                      {partyName}
                    </button>
                  </div>
                </>
              ) : isBothFeedsPost ? (
                // Both-feeds post: show gray party tag above, party + user inline below
                <>
                  <img
                    src={data.user?.avatar || 'https://i.pravatar.cc/40?img=1'}
                    alt={data.user?.username || 'user'}
                    className="reel-user-avatar clickable"
                    style={{ borderColor: getPartyColor(data.user?.party) }}
                    onClick={() => { pauseVideo(); onUsernameClick?.(data.user) }}
                  />
                  <div className="reel-user-details both-feeds">
                    <button className="party-tag-above clickable" onClick={() => { pauseVideo(); onPartyClick?.(partyName) }}>
                      {partyName}
                    </button>
                    <div className="reel-user-tags-row">
                      <button className="party-tag clickable" onClick={() => { pauseVideo(); onPartyClick?.(partyName) }}>
                        {partyName}
                      </button>
                      <div className="username-with-avatar" onClick={() => { pauseVideo(); onUsernameClick?.(data.user) }}>
                        <img
                          src={data.user?.avatar || 'https://i.pravatar.cc/40?img=1'}
                          alt={data.user?.username || 'user'}
                          className="username-mini-avatar"
                        />
                        <button className="username clickable">
                          {data.user?.username || 'unknown'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // User-only post: show user identity
                <>
                  <img
                    src={data.user?.avatar || 'https://i.pravatar.cc/40?img=1'}
                    alt={data.user?.username || 'user'}
                    className="reel-user-avatar clickable"
                    style={{ borderColor: getPartyColor(data.user?.party) }}
                    onClick={() => { pauseVideo(); onUsernameClick?.(data.user) }}
                  />
                  <div className="reel-user-details">
                    {data.user?.party ? (
                      <button className="party-tag clickable" onClick={() => { pauseVideo(); onPartyClick?.(data.user?.party) }}>
                        {data.user?.party}
                      </button>
                    ) : (
                      <span className="party-tag">Independent</span>
                    )}
                    <button className="username clickable" onClick={() => { pauseVideo(); onUsernameClick?.(data.user) }}>
                      {data.user?.username || 'unknown'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <p className="reel-title">{data.title}</p>
            <p className="reel-caption">{data.caption}</p>
          </div>
          {/* Nominate button */}
          <button
              className={`nominate-btn ${hasNominatedPoster ? 'nominated' : ''}`}
              onClick={async () => {
                if (data.targetRace && raceDetails?.id) {
                  // Has target race - call API to toggle nomination
                  try {
                    // Determine target: party for party posts, user otherwise
                    const boostData = data.isPartyPost
                      ? { targetPartyId: data.partyId || data.party?.id }
                      : { targetUserId: data.user?.id }

                    const result = await racesApi.boostCompetitor(raceDetails.id, boostData)

                    // Update UI based on result
                    setHasNominatedPoster(result.boosted)

                    // Update nomination counts in modal if it's open
                    const targetId = data.isPartyPost ? (data.partyId || data.party?.id) : data.user?.id
                    if (targetId) {
                      setNominatedCandidates(prev => {
                        const next = new Set(prev)
                        if (result.boosted) {
                          next.add(targetId)
                        } else {
                          next.delete(targetId)
                        }
                        return next
                      })
                      setNominationCounts(prev => ({
                        ...prev,
                        [targetId]: result.newPoints
                      }))
                    }

                    if (result.boosted) {
                      playNominateSound()
                      if (onTrackActivity) {
                        onTrackActivity('nominate', data)
                      }
                    }
                  } catch (error) {
                    console.log('Nominate error:', error.message)
                  }
                } else if (!data.targetRace) {
                  // No target race - show race selection with default + user's followed races
                  setShowNominateRaceSelect(true)
                }
              }}
            >
              {hasNominatedPoster ? (
                <span className="nominate-check">✓</span>
              ) : (
                <span>Nominate</span>
              )}
            </button>
        </div>
      </div>

      {/* Race Slide-up Modal - portaled to modal-root for z-index */}
      {showRaceModal && createPortal(
        <>
          <div
            className="race-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 2147483646
            }}
            onClick={() => {
              setShowRaceModal(false);
              resumeVideo();
            }}
          />
          <div
            className="race-modal"
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              width: '100%',
              maxWidth: '440px',
              height: '70vh',
              background: 'linear-gradient(180deg, #3D2A1A 0%, #2A1F0F 100%)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 20px 32px',
              zIndex: 2147483647,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              animation: 'slideUpCentered 0.3s ease-out forwards'
            }}
          >
            <div className="race-modal-handle" />

            {/* Countdown Timer */}
            {raceDeadline ? (
              <div className="race-countdown">
                <div className="countdown-segment">
                  <span className="segment-value">{timeRemaining.days}</span>
                  <span className="segment-label">Day(s)</span>
                </div>
                <span className="countdown-colon">:</span>
                <div className="countdown-segment">
                  <span className="segment-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span className="segment-label">Hour(s)</span>
                </div>
                <span className="countdown-colon">:</span>
                <div className="countdown-segment">
                  <span className="segment-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span className="segment-label">Minute(s)</span>
                </div>
                <span className="countdown-colon">:</span>
                <div className="countdown-segment">
                  <span className="segment-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                  <span className="segment-label">Second(s)</span>
                </div>
              </div>
            ) : (
              <div className="race-countdown no-deadline">
                <span className="no-deadline-text">Ongoing Race</span>
              </div>
            )}

            <div className="race-modal-header">
              <div className="race-modal-title-row">
                <h2 className="race-modal-title">{data.targetRace}</h2>
                <div className="race-modal-actions">
                  {/* Hide follow button for system races - everyone auto-follows */}
                  {!raceDetails?.isSystemRace && (
                    <button
                      className={`race-modal-btn follow ${raceFollowed ? 'checked' : ''}`}
                      onClick={async () => {
                        if (!raceDetails?.id) return
                        try {
                          if (raceFollowed) {
                            await racesApi.unfollowRace(raceDetails.id)
                            setRaceFollowed(false)
                          } else {
                            await racesApi.followRace(raceDetails.id)
                            setRaceFollowed(true)
                          }
                        } catch (error) {
                          console.log('Follow race error:', error.message)
                        }
                      }}
                    >
                      {raceFollowed ? '✓ Following' : 'Follow'}
                    </button>
                  )}
                  {/* System races: candidates show "Racing" (auto-enrolled), participants show "Race" with opt-in flow */}
                  {raceDetails?.isSystemRace ? (
                    hasOptedIn ? (
                      <button className="race-modal-btn participate checked" disabled>
                        ✓ Racing
                      </button>
                    ) : (
                      <button
                        className="race-modal-btn participate"
                        onClick={() => setShowOptInConfirm(true)}
                      >
                        Race
                      </button>
                    )
                  ) : (
                    <button
                      className={`race-modal-btn participate ${raceParticipating ? 'checked' : ''}`}
                      onClick={async () => {
                        if (!raceDetails?.id) return
                        try {
                          await racesApi.competeInRace(raceDetails.id)
                          setRaceParticipating(true)
                        } catch (error) {
                          console.log('Compete in race error:', error.message)
                        }
                      }}
                    >
                      {raceParticipating ? '✓ Racing' : 'Join Race'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="race-modal-chart">
              {raceScoreboard.length > 0 ? (
                <RaceChart
                  candidates={raceScoreboard}
                  onCandidateClick={(candidate) => {
                    pauseVideo()
                    if (candidate.isPartyEntry) {
                      // Navigate to party profile for party races
                      onPartyClick?.(candidate.partyName)
                    } else {
                      // Navigate to user profile for user races
                      onUsernameClick?.({
                        id: candidate.id,
                        username: candidate.username,
                        avatar: candidate.avatar,
                        party: null
                      })
                    }
                  }}
                />
              ) : (
                <div className="race-chart-empty">No competitors yet</div>
              )}
            </div>
            <div className="race-contestants-list">
              {raceScoreboard.length > 0 ? (
                raceScoreboard.map((candidate, idx) => {
                  const isNominated = nominatedCandidates.has(candidate.id)
                  return (
                    <div
                      key={candidate.id}
                      className="race-contestant-row"
                      onClick={() => {
                        pauseVideo()
                        if (candidate.isPartyEntry) {
                          // Navigate to party profile for party races
                          onPartyClick?.(candidate.partyName)
                        } else {
                          // Navigate to user profile for user races
                          onUsernameClick?.({
                            id: candidate.id,
                            username: candidate.username,
                            avatar: candidate.avatar,
                            party: null
                          })
                        }
                      }}
                    >
                      <span className="race-contestant-rank">{candidate.rank || idx + 1}</span>
                      <img src={candidate.avatar} alt={candidate.name} className="race-contestant-avatar" />
                      <div className="race-contestant-info">
                        <span className="race-contestant-name">{candidate.name}</span>
                        <span className="race-contestant-nominations">{formatPoints(nominationCounts[candidate.id] || candidate.totalPoints)} pts</span>
                      </div>
                      <div className="race-contestant-stats">
                        <div className="race-contestant-change">
                          <span className={`change-value ${candidate.change >= 0 ? 'positive' : 'negative'}`}>
                            {candidate.change >= 0 ? '+' : ''}{candidate.change}
                          </span>
                        </div>
                        {candidate.sparkline?.length > 1 && <MiniSparkline data={candidate.sparkline} />}
                      </div>
                      <button
                        className={`race-nominate-btn ${isNominated ? 'nominated' : ''}`}
                        onClick={async (e) => {
                          e.stopPropagation()

                          try {
                            // Build boost data based on whether this is a party or user entry
                            const boostData = candidate.isPartyEntry
                              ? { targetPartyId: candidate.id }
                              : { targetUserId: candidate.id }

                            const result = await racesApi.boostCompetitor(raceDetails.id, boostData)

                            // Update local state based on result (toggled)
                            setNominatedCandidates(prev => {
                              const next = new Set(prev)
                              if (result.boosted) {
                                next.add(candidate.id)
                              } else {
                                next.delete(candidate.id)
                              }
                              return next
                            })
                            setNominationCounts(prev => ({
                              ...prev,
                              [candidate.id]: result.newPoints
                            }))

                            // Sync with main Nominate button if this is the poster
                            const posterId = data.isPartyPost ? (data.partyId || data.party?.id) : data.user?.id
                            if (candidate.id === posterId) {
                              setHasNominatedPoster(result.boosted)
                            }

                            if (result.boosted) {
                              playNominateSound()
                            }
                          } catch (error) {
                            console.log('Boost error:', error.message)
                          }
                        }}
                      >
                        {isNominated ? '✓' : '+'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="race-contestants-empty">No competitors yet. Be the first to join!</div>
              )}
            </div>
          </div>
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Opt-in Confirmation Modal for System Races */}
      {showOptInConfirm && createPortal(
        <>
          <div className="race-modal-backdrop" onClick={() => setShowOptInConfirm(false)} />
          <div className="opt-in-confirm-modal">
            <div className="opt-in-confirm-icon">⚠️</div>
            <h3 className="opt-in-confirm-title">Become a Candidate?</h3>
            <p className="opt-in-confirm-message">
              You'll be able to run in races and gain access to reviews and start winning cool people points.
            </p>
            <div className="opt-in-confirm-actions">
              <button
                className="opt-in-confirm-btn cancel"
                onClick={() => setShowOptInConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="opt-in-confirm-btn confirm"
                onClick={() => {
                  onOptIn?.()
                  setShowOptInConfirm(false)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Race Selection Slide-up for main Nominate button */}
      {showNominateRaceSelect && createPortal(
        <>
          <div className="nominate-modal-backdrop" onClick={() => { setShowNominateRaceSelect(false); resumeVideo(); }} />
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
              {/* Default CoolPeople race */}
              <button
                className="nominate-race-item"
                onClick={() => {
                  setSelectedRaceForNomination(DEFAULT_RACE)
                  setShowNominateRaceSelect(false)
                  setShowNominateOptions(true)
                }}
              >
                <span className="nominate-race-dot"></span>
                <span className="nominate-race-name">{DEFAULT_RACE.name}</span>
                <span className="nominate-race-tag">Default</span>
              </button>
              {/* User's followed races */}
              {userRacesFollowing.map(race => (
                <button
                  key={race.id}
                  className="nominate-race-item"
                  onClick={() => {
                    setSelectedRaceForNomination(race)
                    setShowNominateRaceSelect(false)
                    setShowNominateOptions(true)
                  }}
                >
                  <img src={race.avatarUrl || race.icon || `https://i.pravatar.cc/40?u=${race.id}`} alt={race.name} className="nominate-race-icon" />
                  <span className="nominate-race-name">{race.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Quote or Nominate Options Slide-up */}
      {showNominateOptions && createPortal(
        <>
          <div className="nominate-modal-backdrop" onClick={() => {
            setShowNominateOptions(false)
            setSelectedRaceForNomination(null)
            resumeVideo()
          }} />
          <div className="nominate-modal nominate-options">
            <div className="nominate-modal-handle" />
            <h3 className="nominate-modal-title">
              Nominate @{data.user?.username || 'user'} to {selectedRaceForNomination?.name}
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
                  setShowNominateOptions(false)
                  setSelectedRaceForNomination(null)
                  setHasNominatedPoster(true)
                  playNominateSound()
                  if (onTrackActivity) {
                    onTrackActivity('nominate', data)
                  }
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
        document.getElementById('modal-root') || document.body
      )}

      {/* Quote Nominate Screen */}
      {showQuoteNominate && (
        <QuoteNominateScreen
          reel={data}
          selectedRace={selectedRaceForNomination}
          onClose={() => {
            setShowQuoteNominate(false)
            setSelectedRaceForNomination(null)
            resumeVideo()
          }}
          onComplete={() => {
            setShowQuoteNominate(false)
            setSelectedRaceForNomination(null)
            // Show checkmark and play sound after completing nomination
            setHasNominatedPoster(true)
            playNominateSound()
            if (onTrackActivity) {
              onTrackActivity('nominate', data)
            }
            resumeVideo()
          }}
        />
      )}

      {/* Quote Repost Screen */}
      {showQuoteRepost && (
        <QuoteNominateScreen
          reel={data}
          selectedRace={null}
          isQuoteMode={true}
          onClose={() => {
            setShowQuoteRepost(false)
            resumeVideo()
          }}
          onComplete={() => {
            setShowQuoteRepost(false)
            if (onTrackActivity) {
              onTrackActivity('quote', data)
            }
            resumeVideo()
          }}
        />
      )}
    </div>
  )
}

export default ReelCard
