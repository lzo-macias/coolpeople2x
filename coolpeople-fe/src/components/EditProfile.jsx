import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styling/EditProfile.css'
import '../styling/ReelCard.css'
import '../styling/PartyCreationFlow.css'
import EditBio from './EditBio'
import { useAuth } from '../contexts/AuthContext'
import { partiesApi, usersApi, subscriptionsApi } from '../services/api'
import { DEFAULT_USER_AVATAR } from '../utils/avatarDefaults'

function EditProfile({ candidate, profileSections, onSave, onClose, initialSection = null, onOptOut, onOptIn }) {
  const { logout, user: currentUser, updateUser, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [searchQuery, setSearchQuery] = useState('')

  // Update activeSection when initialSection prop changes
  useEffect(() => {
    if (initialSection !== null) {
      setActiveSection(initialSection)
    }
  }, [initialSection])
  const [showStatusWarning, setShowStatusWarning] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [partySearch, setPartySearch] = useState('')

  // Party change confirmation
  const [showPartyConfirmation, setShowPartyConfirmation] = useState(false)
  const [pendingParty, setPendingParty] = useState(null)
  const [isChangingParty, setIsChangingParty] = useState(false)
  const [raceSearch, setRaceSearch] = useState('')
  const [selectedRaceDetail, setSelectedRaceDetail] = useState(null)
  const [editedCandidate, setEditedCandidate] = useState({
    username: candidate?.username || '',
    bio: candidate?.bio || '',
    avatar: candidate?.avatar || '',
    party: candidate?.party || 'Independent',
    status: candidate?.status || 'Participant',
    privacy: candidate?.privacy || 'Public',
  })

  // Avatar file input ref
  const avatarInputRef = useRef(null)

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setEditedCandidate(prev => ({ ...prev, avatar: dataUrl }))
      onSave?.({ avatar: dataUrl })
    }
    reader.readAsDataURL(file)
    // Reset input so selecting the same file triggers onChange again
    e.target.value = ''
  }

  // Username change tracking (can only change once every 2 weeks)
  const [lastUsernameChange, setLastUsernameChange] = useState(() => {
    // Mock: last changed 20 days ago (can change now)
    const date = new Date()
    date.setDate(date.getDate() - 20)
    return date
  })
  const [pendingUsername, setPendingUsername] = useState('')
  const [showUsernameWarning, setShowUsernameWarning] = useState(false)

  const canChangeUsername = () => {
    const now = new Date()
    const daysSinceChange = Math.floor((now - lastUsernameChange) / (1000 * 60 * 60 * 24))
    return daysSinceChange >= 14
  }

  const daysUntilUsernameChange = () => {
    const now = new Date()
    const daysSinceChange = Math.floor((now - lastUsernameChange) / (1000 * 60 * 60 * 24))
    return Math.max(0, 14 - daysSinceChange)
  }

  const [allNotificationsEnabled, setAllNotificationsEnabled] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [faceIdEnabled, setFaceIdEnabled] = useState(true)
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    raceUpdates: true,
    reviews: true,
    nominates: true,
    reposts: true,
  })

  // Mock data
  const savedPosts = [
    { id: 1, image: 'https://picsum.photos/200/300?random=1' },
    { id: 2, image: 'https://picsum.photos/200/300?random=2' },
    { id: 3, image: 'https://picsum.photos/200/300?random=3' },
    { id: 4, image: 'https://picsum.photos/200/300?random=4' },
    { id: 5, image: 'https://picsum.photos/200/300?random=5' },
    { id: 6, image: 'https://picsum.photos/200/300?random=6' },
  ]

  const archivedPosts = [
    { id: 1, image: 'https://picsum.photos/200/300?random=11' },
    { id: 2, image: 'https://picsum.photos/200/300?random=12' },
    { id: 3, image: 'https://picsum.photos/200/300?random=13' },
    { id: 4, image: 'https://picsum.photos/200/300?random=14' },
    { id: 5, image: 'https://picsum.photos/200/300?random=15' },
    { id: 6, image: 'https://picsum.photos/200/300?random=16' },
    { id: 7, image: 'https://picsum.photos/200/300?random=17' },
    { id: 8, image: 'https://picsum.photos/200/300?random=18' },
    { id: 9, image: 'https://picsum.photos/200/300?random=19' },
  ]

  const blockedUsers = [
    { id: 1, username: 'toxic_troll', avatar: 'https://i.pravatar.cc/150?img=10' },
    { id: 2, username: 'spammer99', avatar: 'https://i.pravatar.cc/150?img=20' },
    { id: 3, username: 'rude_dude', avatar: 'https://i.pravatar.cc/150?img=30' },
  ]

  const silencedUsers = [
    { id: 1, username: 'annoying_poster', avatar: 'https://i.pravatar.cc/150?img=40' },
    { id: 2, username: 'too_much_drama', avatar: 'https://i.pravatar.cc/150?img=50' },
  ]

  const connectedDevices = [
    { id: 1, name: 'iPhone 15 Pro', location: 'Los Angeles, CA', lastActive: 'Active now', current: true },
    { id: 2, name: 'MacBook Pro', location: 'Los Angeles, CA', lastActive: '2 hours ago', current: false },
    { id: 3, name: 'iPad Air', location: 'San Francisco, CA', lastActive: '3 days ago', current: false },
  ]

  const [myNominations, setMyNominations] = useState([
    { id: 1, user: { username: 'sarah_politics', avatar: 'https://i.pravatar.cc/40?img=5' }, race: 'General', date: '2 days ago' },
    { id: 2, user: { username: 'mike_2024', avatar: 'https://i.pravatar.cc/40?img=8' }, race: 'Mayor Race 2025', date: '5 days ago' },
    { id: 3, user: { username: 'jane_votes', avatar: 'https://i.pravatar.cc/40?img=9' }, race: 'General', date: '1 week ago' },
    { id: 4, user: { username: 'alex_liberty', avatar: 'https://i.pravatar.cc/40?img=12' }, race: 'City Council District 5', date: '1 week ago' },
    { id: 5, user: { username: 'rosa_change', avatar: 'https://i.pravatar.cc/40?img=16' }, race: 'General', date: '2 weeks ago' },
    { id: 6, user: { username: 'david_future', avatar: 'https://i.pravatar.cc/40?img=18' }, race: 'State Senate Race', date: '2 weeks ago' },
    { id: 7, user: { username: 'emma_voice', avatar: 'https://i.pravatar.cc/40?img=23' }, race: 'General', date: '3 weeks ago' },
    { id: 8, user: { username: 'chris_2025', avatar: 'https://i.pravatar.cc/40?img=25' }, race: 'The Pink Lady Competition', date: '1 month ago' },
  ])
  const [nominationSearch, setNominationSearch] = useState('')

  // Fetch real parties from API
  const [parties, setParties] = useState([])
  const [partiesLoading, setPartiesLoading] = useState(false)

  useEffect(() => {
    const fetchParties = async () => {
      setPartiesLoading(true)
      try {
        const response = await partiesApi.listParties('', null, 50)
        const partiesData = response.data?.parties || response.parties || []
        // Sort by member count (most members first)
        const sorted = partiesData.sort((a, b) => {
          const countA = a.memberCount || a._count?.memberships || 0
          const countB = b.memberCount || b._count?.memberships || 0
          return countB - countA
        })
        // Map to expected format
        const formattedParties = sorted.map(p => ({
          id: p.id,
          name: p.name,
          handle: p.handle,
          color: p.color || '#888888',
          avatar: p.avatarUrl,
          memberCount: p.memberCount || p._count?.memberships || 0
        }))
        setParties(formattedParties)
      } catch (error) {
        console.error('Failed to fetch parties:', error)
        setParties([])
      } finally {
        setPartiesLoading(false)
      }
    }
    fetchParties()
  }, [])

  const statuses = ['Participant', 'Candidate']

  // Mock races data
  const [myRaces, setMyRaces] = useState([
    { id: 1, name: 'Mayor Race 2025', type: 'candidate', icon: 'https://i.pravatar.cc/40?img=60', deadline: '290 days', totalCandidates: 8, yourRank: 3 },
    { id: 2, name: 'City Council District 5', type: 'following', icon: 'https://i.pravatar.cc/40?img=52', deadline: '180 days', totalCandidates: 12, yourRank: null },
    { id: 3, name: 'The Pink Lady Competition', type: 'candidate', icon: 'https://i.pravatar.cc/40?img=47', deadline: '45 days', totalCandidates: 24, yourRank: 7 },
    { id: 4, name: 'State Senate Race', type: 'following', icon: 'https://i.pravatar.cc/40?img=33', deadline: '320 days', totalCandidates: 6, yourRank: null },
    { id: 5, name: 'CoolPeople Annual 2025', type: 'candidate', icon: 'https://i.pravatar.cc/40?img=28', deadline: '365 days', totalCandidates: 156, yourRank: 42 },
  ])

  // Mock race chart data for detail view
  const raceChartData = [
    { id: 1, name: 'William H.', avatar: 'https://i.pravatar.cc/40?img=12', data: [1.2, 1.5, 1.8, 2.1, 2.4, 2.6, 2.8, 2.9, 3.0], nominations: '25,000', stars: 4.8 },
    { id: 2, name: 'Sarah J.', avatar: 'https://i.pravatar.cc/40?img=5', data: [1.1, 1.3, 1.6, 1.9, 2.2, 2.4, 2.5, 2.6, 2.7], nominations: '18,500', stars: 4.5 },
    { id: 3, name: 'Alex M.', avatar: 'https://i.pravatar.cc/40?img=3', data: [1.0, 1.2, 1.4, 1.7, 1.9, 2.1, 2.3, 2.4, 2.5], nominations: '15,200', stars: 4.3 },
    { id: 4, name: 'Mike T.', avatar: 'https://i.pravatar.cc/40?img=8', data: [0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.0, 2.1, 2.2], nominations: '12,800', stars: 4.1 },
    { id: 5, name: 'Jordan P.', avatar: 'https://i.pravatar.cc/40?img=14', data: [0.8, 1.0, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9], nominations: '9,400', stars: 3.9 },
    { id: 6, name: 'Casey R.', avatar: 'https://i.pravatar.cc/40?img=16', data: [0.7, 0.9, 1.0, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7], nominations: '7,100', stars: 3.7 },
    { id: 7, name: 'Taylor M.', avatar: 'https://i.pravatar.cc/40?img=18', data: [0.6, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5], nominations: '5,600', stars: 3.5 },
    { id: 8, name: 'Morgan L.', avatar: 'https://i.pravatar.cc/40?img=20', data: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3], nominations: '3,200', stars: 3.2 },
  ]

  // RaceChart component
  const RaceChart = ({ candidates, onCandidateClick }) => {
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

    const colors = [
      '#E8A855', '#D4954A', '#C08340', '#AB7135',
      '#976030', '#8A5528', '#7D4A20', '#704018'
    ]

    return (
      <svg width={width} height={height} className="race-chart-svg">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="rgba(232, 168, 85, 0.2)" />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="rgba(232, 168, 85, 0.2)" />

        <text x={padding.left - 8} y={padding.top + 5} fill="#E8A855" fontSize="10" textAnchor="end">3M</text>
        <text x={padding.left - 8} y={padding.top + chartHeight / 2} fill="#E8A855" fontSize="10" textAnchor="end">2M</text>
        <text x={padding.left - 8} y={padding.top + chartHeight - 5} fill="#E8A855" fontSize="10" textAnchor="end">1M</text>

        {xLabels.map((label, i) => (
          <text key={label} x={getX(i * 4, 9)} y={height - 5} fill="#E8A855" fontSize="10" textAnchor="middle">{label}</text>
        ))}

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

        {candidates
          .map((candidate, idx) => ({ candidate, idx, isHovered: hoveredId === candidate.id }))
          .sort((a, b) => (a.isHovered ? 1 : 0) - (b.isHovered ? 1 : 0))
          .map(({ candidate, idx, isHovered }) => {
            const lastX = getX(candidate.data.length - 1, candidate.data.length)
            const lastY = getY(candidate.data[candidate.data.length - 1])
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
                <clipPath id={`clip-edit-${candidate.id}`}>
                  <circle cx={lastX + 18} cy={lastY} r={radius - 2} />
                </clipPath>
                <image
                  href={candidate.avatar}
                  x={lastX + 18 - imgOffset}
                  y={lastY - imgOffset}
                  width={imgSize}
                  height={imgSize}
                  clipPath={`url(#clip-edit-${candidate.id})`}
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

  // Live countdown for race detail
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    if (!selectedRaceDetail) return

    const deadline = new Date()
    const daysMatch = selectedRaceDetail.deadline.match(/(\d+)/)
    const daysToAdd = daysMatch ? parseInt(daysMatch[1]) : 30
    deadline.setDate(deadline.getDate() + daysToAdd)

    const calculateTimeRemaining = () => {
      const now = new Date()
      const diff = deadline - now
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
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
  }, [selectedRaceDetail])

  const handleUnfollowRace = (raceId) => {
    setMyRaces(prev => prev.filter(r => r.id !== raceId))
    setSelectedRaceDetail(null)
  }

  const handleDropOutRace = (raceId) => {
    setMyRaces(prev => prev.filter(r => r.id !== raceId))
    setSelectedRaceDetail(null)
  }

  const getPartyColor = (partyName) => {
    if (!partyName || partyName === 'Independent') return '#888888'
    const party = parties.find(p => p.name === partyName)
    return party?.color || '#888888'
  }

  // Count filled icebreakers
  const getFilledIcebreakersCount = () => {
    if (!profileSections) return 0
    let count = 0

    // Sliders
    if (profileSections.viewsOnIce?.score !== null && profileSections.viewsOnIce?.score !== undefined) count++
    if (profileSections.viewsOnTransRights?.score !== null && profileSections.viewsOnTransRights?.score !== undefined) count++
    if (profileSections.viewsOnHealthcare?.score !== null && profileSections.viewsOnHealthcare?.score !== undefined) count++
    if (profileSections.viewsOnGunControl?.score !== null && profileSections.viewsOnGunControl?.score !== undefined) count++

    // Text fields
    if (profileSections.hillToDieOn?.content) count++
    if (profileSections.accomplishment?.content) count++

    // Tags
    if (profileSections.topicsThatEnergize?.tags?.length > 0) count++

    // Games
    if (profileSections.guessWhichTrue?.options?.some(o => o)) count++
    if (profileSections.wouldYouRather?.optionA || profileSections.wouldYouRather?.optionB) count++
    if (profileSections.unpopularOpinion?.opinion) count++

    // Custom icebreakers
    if (profileSections.customWritten?.length > 0) count += profileSections.customWritten.length
    if (profileSections.customSliders?.length > 0) count += profileSections.customSliders.length

    return count
  }

  // Render main settings menu
  const renderMainMenu = () => (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Settings</h1>
      </div>

      {/* Search */}
      <div className="settings-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Profile Picture */}
      <div className="settings-avatar-section">
        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <div className="settings-avatar-container" onClick={() => avatarInputRef.current?.click()} style={{ cursor: 'pointer' }}>
          {editedCandidate.avatar ? (
            <img src={editedCandidate.avatar} alt="Profile" className="settings-avatar" />
          ) : (
            <img src={DEFAULT_USER_AVATAR} alt="Default avatar" className="settings-avatar" />
          )}
        </div>
        <button className="edit-picture-link" onClick={() => avatarInputRef.current?.click()}>Edit profile picture</button>
      </div>

      {/* Account Section */}
      <p className="settings-section-label">Account</p>
      <div className="settings-card">
        <button className="settings-row" onClick={() => setActiveSection('status')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="settings-row-label">Status</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-badge">{editedCandidate.status}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('username')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
              </svg>
            </span>
            <span className="settings-row-label">Username</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.username || 'Set username'}</span>
            {!canChangeUsername() && (
              <span className="settings-row-note">{daysUntilUsernameChange()}d left</span>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('premium')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent-gradient">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <defs>
                  <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F2EA" />
                    <stop offset="100%" stopColor="#FF2A55" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="7" height="7" stroke="url(#icon-gradient)" />
                <rect x="14" y="3" width="7" height="7" stroke="url(#icon-gradient)" />
                <rect x="3" y="14" width="7" height="7" stroke="url(#icon-gradient)" />
                <rect x="14" y="14" width="3" height="3" stroke="url(#icon-gradient)" />
                <rect x="18" y="14" width="3" height="3" stroke="url(#icon-gradient)" />
                <rect x="14" y="18" width="3" height="3" stroke="url(#icon-gradient)" />
                <rect x="18" y="18" width="3" height="3" stroke="url(#icon-gradient)" />
              </svg>
            </span>
            <span className="settings-row-label">Premium</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">Upgrade</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('party')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="settings-row-label">Party</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.party || 'Independent'}</span>
            <span
              className="party-color-dot"
              style={{ background: getPartyColor(editedCandidate.party) }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      </div>

      {/* Activity Section */}
      <p className="settings-section-label">Activity</p>
      <div className="settings-card">
        <button className="settings-row" onClick={() => setActiveSection('icebreakers')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="settings-row-label">Icebreakers</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-count">{getFilledIcebreakersCount()}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('races')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </span>
            <span className="settings-row-label">Races</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-count">{myRaces.length}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      </div>

      {/* Privacy & Data Section */}
      <p className="settings-section-label">Privacy & Data</p>
      <div className="settings-card">
        <button
          className={`settings-row ${editedCandidate.status === 'Candidate' ? 'disabled' : ''}`}
          onClick={() => editedCandidate.status !== 'Candidate' && setActiveSection('profile-privacy')}
        >
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span className="settings-row-label">Privacy</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">
              {editedCandidate.status === 'Candidate' ? 'Public' : editedCandidate.privacy}
            </span>
            {editedCandidate.status === 'Candidate' && (
              <span className="settings-row-note">candidates only</span>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('saved')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </span>
            <span className="settings-row-label">Saved</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('blocked')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent-pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </span>
            <span className="settings-row-label">Blocked</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <p className="settings-section-label">Content</p>
      <div className="settings-card">
        <button className="settings-row" onClick={() => setActiveSection('archives')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </span>
            <span className="settings-row-label">Archives</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('notifications')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <span className="settings-row-label">Notifications</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('silenced')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </span>
            <span className="settings-row-label">Silenced</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* CoolPeople Tools */}
      <p className="settings-section-label">CoolPeople Tools</p>
      <div className="settings-card">
        <button className="settings-row" onClick={() => setActiveSection('nominations')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span className="settings-row-label">My Nominations</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('ballot')}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent-pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z" />
                <polyline points="8 10 12 14 16 10" />
              </svg>
            </span>
            <span className="settings-row-label">My Ballot</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Account & Security */}
      <p className="settings-section-label">Account & Security</p>
      <div className="settings-card">
        <button className="settings-row" onClick={() => setActiveSection('account')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="settings-row-label">Account</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('security')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="settings-row-label">Security</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="settings-row" onClick={() => { logout(); onClose(); }}>
          <div className="settings-row-left">
            <span className="settings-row-icon accent-pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="settings-row-label">Log Out</span>
          </div>
        </button>
      </div>
    </div>
  )

  // Render Status selection
  const renderStatusSection = () => {
    const getWarningContent = () => {
      if (pendingStatus === 'Participant') {
        return {
          title: 'Switch to Participant?',
          message: "You won't be able to run in races and this will disable your reviews and cool people points."
        }
      } else {
        return {
          title: 'Switch to Candidate?',
          message: "You'll be able to run in races and gain access to reviews and start winning cool people points"
        }
      }
    }

    const warningContent = getWarningContent()

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Status</h1>
        </div>
        <div className="settings-list selection-list">
          {statuses.map(status => (
            <button
              key={status}
              className={`settings-row selection ${editedCandidate.status === status ? 'selected' : ''}`}
              onClick={() => {
                if (status !== editedCandidate.status) {
                  setPendingStatus(status)
                  setShowStatusWarning(true)
                }
              }}
            >
              <span className="settings-row-label">{status}</span>
              {editedCandidate.status === status && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Warning Modal */}
        {showStatusWarning && (
          <div className="status-warning-overlay" onClick={() => { setShowStatusWarning(false); setPendingStatus(null); }}>
            <div className="status-warning-modal" onClick={(e) => e.stopPropagation()}>
              <div className="warning-icon">⚠️</div>
              <h3>{warningContent.title}</h3>
              <p>{warningContent.message}</p>
              <div className="warning-actions">
                <button
                  className="warning-btn cancel"
                  onClick={() => { setShowStatusWarning(false); setPendingStatus(null); }}
                >
                  Cancel
                </button>
                <button
                  className="warning-btn confirm"
                  onClick={() => {
                    if (pendingStatus === 'Participant') {
                      onOptOut?.()
                      onClose?.()
                    } else {
                      onOptIn?.()
                      onClose?.()
                    }
                    setShowStatusWarning(false)
                    setPendingStatus(null)
                    setActiveSection(null)
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Party selection
  const renderPartySection = () => {
    const filteredParties = parties.filter(party =>
      party.name.toLowerCase().includes(partySearch.toLowerCase()) ||
      (party.handle && party.handle.toLowerCase().includes(partySearch.toLowerCase()))
    )

    // Check if current user is Independent (no party)
    const currentPartyName = editedCandidate.party || 'Independent'
    const isIndependent = currentPartyName === 'Independent'

    // Handle clicking on a party option - show confirmation
    const handlePartyClick = (party) => {
      // Don't show confirmation if already in this party
      if (party === null && isIndependent) return
      if (party && editedCandidate.party === party.name) return

      setPendingParty(party) // null means Independent
      setShowPartyConfirmation(true)
    }

    // Handle confirming party change
    const handleConfirmPartyChange = async () => {
      setIsChangingParty(true)
      try {
        if (pendingParty === null) {
          // Leaving party to become Independent
          // Use partyId from auth context or find in parties list
          const userPartyId = currentUser?.partyId
          const currentParty = parties.find(p => p.name === editedCandidate.party)
          const partyIdToLeave = userPartyId || currentParty?.id

          console.log('Leaving party:', { userPartyId, currentParty, partyIdToLeave })

          if (!partyIdToLeave) {
            console.error('No party ID found to leave')
            alert('Could not find your current party. Please try again.')
            return
          }

          const response = await partiesApi.leaveParty(partyIdToLeave)
          console.log('Leave party response:', response)

          // Update local state only after successful API call
          setEditedCandidate(prev => ({ ...prev, party: 'Independent' }))
          // Update auth context
          updateUser?.({ partyId: null, party: null })
        } else {
          // Joining a new party (API handles leaving old party automatically)
          console.log('Joining party:', pendingParty.id)
          const response = await partiesApi.joinParty(pendingParty.id)
          console.log('Join party response:', response)
          // Update local state only after successful API call
          setEditedCandidate(prev => ({ ...prev, party: pendingParty.name }))
          // Update auth context
          updateUser?.({ partyId: pendingParty.id, party: pendingParty.name })
        }

        console.log('Party changed successfully')

        // Refresh user data from server to update sitewide
        const updatedUser = await refreshUser?.()
        console.log('Refreshed user data:', updatedUser)

        setShowPartyConfirmation(false)
        setPendingParty(null)
        setPartySearch('')
        setActiveSection(null)
      } catch (error) {
        console.error('Failed to change party:', error)
        console.error('Error details:', error.message, error.response)
        alert('Failed to change party. Please try again.')
      } finally {
        setIsChangingParty(false)
      }
    }

    const getPendingPartyColor = () => pendingParty ? (pendingParty.color || '#FF2A55') : '#FF2A55'

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => { setActiveSection(null); setPartySearch(''); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Party</h1>
          <button className="settings-add-btn" onClick={() => setActiveSection('create-party')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="settings-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search parties"
            value={partySearch}
            onChange={(e) => setPartySearch(e.target.value)}
          />
        </div>

        <div className="settings-list selection-list">
          {/* Independent option always at top */}
          {(!partySearch || 'independent'.includes(partySearch.toLowerCase())) && (
            <button
              className={`settings-row selection ${isIndependent ? 'selected' : ''}`}
              onClick={() => handlePartyClick(null)}
            >
              <div className="settings-row-left">
                <span className="party-color-dot" style={{ background: '#888888' }} />
                <span className="settings-row-label">Independent</span>
              </div>
              {isIndependent && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          )}

          {/* Loading state */}
          {partiesLoading && (
            <div className="no-results">Loading parties...</div>
          )}

          {/* Popular parties header */}
          {!partiesLoading && filteredParties.length > 0 && !partySearch && (
            <div className="settings-section-label" style={{ padding: '16px 0 8px', color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>
              Popular Parties
            </div>
          )}

          {/* Real parties from API */}
          {filteredParties.map(party => (
            <button
              key={party.id}
              className={`settings-row selection ${editedCandidate.party === party.name ? 'selected' : ''}`}
              onClick={() => handlePartyClick(party)}
            >
              <div className="settings-row-left">
                {party.avatar ? (
                  <img
                    src={party.avatar}
                    alt={party.name}
                    style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 12 }}
                  />
                ) : (
                  <span className="party-color-dot" style={{ background: party.color }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="settings-row-label">{party.name}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    {party.memberCount} member{party.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {editedCandidate.party === party.name && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}

          {!partiesLoading && filteredParties.length === 0 && partySearch && (
            <div className="no-results">No parties found</div>
          )}
        </div>

        {/* Party Change Confirmation Dialog */}
        {showPartyConfirmation && (
          <div className="party-confirm-overlay" style={{ zIndex: 10002 }}>
            <div className="party-confirm-dialog">
              <div className="party-confirm-icon" style={{ background: getPendingPartyColor() }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="party-confirm-title">
                {pendingParty ? `Join ${pendingParty.name}?` : 'Become Independent?'}
              </h3>
              <p className="party-confirm-message">
                You're currently <strong>{currentPartyName}</strong>.
                {pendingParty
                  ? <> Joining this party will change your affiliation to <strong style={{ color: getPendingPartyColor() }}>{pendingParty.name}</strong>.</>
                  : <> You will leave your current party and become <strong style={{ color: '#888' }}>Independent</strong>.</>
                }
              </p>
              <div className="party-confirm-actions">
                <button
                  className="party-confirm-cancel"
                  onClick={() => {
                    setShowPartyConfirmation(false)
                    setPendingParty(null)
                  }}
                  disabled={isChangingParty}
                >
                  Stay in {currentPartyName}
                </button>
                <button
                  className="party-confirm-create"
                  style={{ background: getPendingPartyColor() }}
                  onClick={handleConfirmPartyChange}
                  disabled={isChangingParty}
                >
                  {isChangingParty ? 'Changing...' : (pendingParty ? 'Join Party' : 'Go Independent')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Icebreakers section
  const renderIcebreakersSection = () => {
    // If we came directly to icebreakers (via add button), back/save should close entirely
    const handleBack = () => {
      if (initialSection === 'icebreakers') {
        onClose?.()
      } else {
        setActiveSection(null)
      }
    }

    return (
      <div className="settings-page icebreakers-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Icebreakers</h1>
        </div>
        <div className="icebreakers-container">
          <EditBio
            profileData={profileSections}
            onSave={(updatedData) => {
              onSave?.(updatedData)
              if (initialSection === 'icebreakers') {
                onClose?.()
              } else {
                setActiveSection(null)
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Render Saved section - Grid of saved posts
  const renderSavedSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Saved</h1>
      </div>
      {savedPosts.length > 0 ? (
        <div className="saved-posts-grid">
          {savedPosts.map(post => (
            <div key={post.id} className="saved-post-item">
              <img src={post.image} alt="Saved post" />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No saved posts yet</p>
        </div>
      )}
    </div>
  )

  // Render Archives section - Grid of archived posts
  const renderArchivesSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Archives</h1>
      </div>
      {archivedPosts.length > 0 ? (
        <div className="saved-posts-grid">
          {archivedPosts.map(post => (
            <div key={post.id} className="saved-post-item">
              <img src={post.image} alt="Archived post" />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No archived posts yet</p>
        </div>
      )}
    </div>
  )

  // Render Blocked section - Line of blocked profiles
  const renderBlockedSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Blocked</h1>
      </div>
      {blockedUsers.length > 0 ? (
        <div className="users-line-list">
          {blockedUsers.map(user => (
            <div key={user.id} className="user-line-item">
              <div className="user-line-left">
                <img src={user.avatar} alt={user.username} className="user-line-avatar" />
                <span className="user-line-username">{user.username}</span>
              </div>
              <button className="user-action-btn">Unblock</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No blocked users</p>
        </div>
      )}
    </div>
  )

  // Render Notifications section - Toggles with master toggle
  const renderNotificationsSection = () => {
    const toggleAll = () => {
      const newValue = !allNotificationsEnabled
      setAllNotificationsEnabled(newValue)
      setNotifications({
        likes: newValue,
        comments: newValue,
        follows: newValue,
        mentions: newValue,
        messages: newValue,
        raceUpdates: newValue,
        reviews: newValue,
        nominates: newValue,
        reposts: newValue,
      })
    }

    const notificationLabels = {
      likes: { label: 'Likes', icon: '❤️' },
      comments: { label: 'Comments', icon: '💬' },
      follows: { label: 'New Followers', icon: '👤' },
      mentions: { label: 'Mentions', icon: '@' },
      messages: { label: 'Direct Messages', icon: '✉️' },
      raceUpdates: { label: 'Race Updates', icon: '🏁' },
      reviews: { label: 'Reviews', icon: '⭐' },
      nominates: { label: 'Nominates', icon: '🎯' },
      reposts: { label: 'Reposts', icon: '🔄' },
    }

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Notifications</h1>
        </div>

        <div className="notifications-list">
          <div className="notification-item master">
            <span className="notification-label">All Notifications</span>
            <button className={`toggle-btn ${allNotificationsEnabled ? 'on' : ''}`} onClick={toggleAll}>
              <span className="toggle-knob" />
            </button>
          </div>

          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="notification-item">
              <div className="notification-label-row">
                <span className="notification-icon">{notificationLabels[key].icon}</span>
                <span className="notification-label">{notificationLabels[key].label}</span>
              </div>
              <button
                className={`toggle-btn ${value ? 'on' : ''}`}
                onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render Silenced section - Line of silenced users
  const renderSilencedSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Silenced</h1>
      </div>
      {silencedUsers.length > 0 ? (
        <div className="users-line-list">
          {silencedUsers.map(user => (
            <div key={user.id} className="user-line-item">
              <div className="user-line-left">
                <img src={user.avatar} alt={user.username} className="user-line-avatar" />
                <span className="user-line-username">{user.username}</span>
              </div>
              <button className="user-action-btn">Unsilence</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No silenced users</p>
        </div>
      )}
    </div>
  )

  // Render Security section
  const renderSecuritySection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Security</h1>
      </div>

      <div className="settings-section">
        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveSection('change-password')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🔑</span>
              <span className="settings-row-label">Change Password</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="notification-item">
            <div className="notification-label-row">
              <span className="notification-icon">🔐</span>
              <span className="notification-label">Two-Factor Authentication</span>
            </div>
            <button
              className={`toggle-btn ${twoFactorEnabled ? 'on' : ''}`}
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="notification-item">
            <div className="notification-label-row">
              <span className="notification-icon">😊</span>
              <span className="notification-label">Face ID / Touch ID</span>
            </div>
            <button
              className={`toggle-btn ${faceIdEnabled ? 'on' : ''}`}
              onClick={() => setFaceIdEnabled(!faceIdEnabled)}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <button className="settings-row" onClick={() => setActiveSection('connected-devices')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">📱</span>
              <span className="settings-row-label">Connected Devices</span>
            </div>
            <div className="settings-row-right">
              <span className="settings-row-value">{connectedDevices.length}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  // Render Change Password section
  const renderChangePasswordSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection('security')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Change Password</h1>
      </div>

      <div className="username-section-content">
        <div className="username-input-container">
          <input
            type="password"
            className="username-input"
            placeholder="Current password"
          />
        </div>
        <div className="username-input-container">
          <input
            type="password"
            className="username-input"
            placeholder="New password"
          />
        </div>
        <div className="username-input-container">
          <input
            type="password"
            className="username-input"
            placeholder="Confirm new password"
          />
        </div>

        <p className="username-note">
          Password must be at least 8 characters and include a number and special character.
        </p>

        <button className="username-save-btn">
          Update Password
        </button>
      </div>
    </div>
  )

  // Render Connected Devices section
  const renderConnectedDevicesSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection('security')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Connected Devices</h1>
      </div>

      <div className="users-line-list">
        {connectedDevices.map(device => (
          <div key={device.id} className="user-line-item">
            <div className="user-line-left">
              <span className="device-icon">{device.name.includes('iPhone') ? '📱' : device.name.includes('iPad') ? '📱' : '💻'}</span>
              <div className="device-info">
                <span className="device-name">{device.name} {device.current && <span className="current-badge">This device</span>}</span>
                <span className="device-location">{device.location} · {device.lastActive}</span>
              </div>
            </div>
            {!device.current && (
              <button className="user-action-btn">Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // Render My Nominations section
  const renderNominationsSection = () => {
    const filteredNominations = myNominations.filter(nom =>
      nom.user.username.toLowerCase().includes(nominationSearch.toLowerCase()) ||
      nom.race.toLowerCase().includes(nominationSearch.toLowerCase())
    )

    const handleUnnominate = (nominationId) => {
      setMyNominations(prev => prev.filter(n => n.id !== nominationId))
    }

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => { setActiveSection(null); setNominationSearch(''); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">My Nominations</h1>
        </div>

        {/* Search */}
        <div className="settings-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search nominations"
            value={nominationSearch}
            onChange={(e) => setNominationSearch(e.target.value)}
          />
        </div>

        {/* Nominations List */}
        <div className="my-nominations-list">
          {filteredNominations.length > 0 ? (
            filteredNominations.map(nomination => (
              <div key={nomination.id} className="my-nom-item">
                <img src={nomination.user.avatar} alt={nomination.user.username} className="my-nom-avatar" />
                <div className="my-nom-info">
                  <span className="my-nom-username">{nomination.user.username}</span>
                  <span className="my-nom-race">{nomination.race}</span>
                </div>
                <button
                  className="unnominate-btn"
                  onClick={() => handleUnnominate(nomination.id)}
                >
                  Unnominate
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>{nominationSearch ? 'No nominations found' : 'No nominations yet'}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Premium section
  const [selectedPremiumTier, setSelectedPremiumTier] = useState(null)
  const [premiumBillingCycle, setPremiumBillingCycle] = useState('monthly')
  const [discountCode, setDiscountCode] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [discountResult, setDiscountResult] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')

  // Fetch current subscription on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await subscriptionsApi.getMySubscription()
        const sub = res.data?.subscription || res.subscription
        if (sub && sub.isActive) {
          setCurrentSubscription(sub)
          setSelectedPremiumTier(sub.tier)
          setPremiumBillingCycle(sub.billingCycle || 'monthly')
        }
      } catch {
        // No subscription or error - that's fine
      }
    }
    fetchSubscription()
  }, [])

  const handleSubscribe = async () => {
    if (!selectedPremiumTier || isSubscribing) return
    setIsSubscribing(true)
    setSubscriptionError('')
    try {
      const res = await subscriptionsApi.createCheckout({
        tier: selectedPremiumTier,
        billingCycle: premiumBillingCycle,
        ...(discountResult?.isValid && discountCode ? { discountCode } : {}),
      })
      const checkoutUrl = res.data?.checkoutUrl || res.checkoutUrl
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        setSubscriptionError('Failed to create checkout session')
        setIsSubscribing(false)
      }
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to start checkout')
      setIsSubscribing(false)
    }
  }

  const handleCancelSubscription = async () => {
    setSubscriptionError('')
    try {
      const res = await subscriptionsApi.createPortal()
      const portalUrl = res.data?.portalUrl || res.portalUrl
      if (portalUrl) {
        window.location.href = portalUrl
      } else {
        setSubscriptionError('Failed to open subscription management')
      }
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to open subscription management')
    }
  }

  // Detect checkout success from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return

    // Clean up URL
    const url = new URL(window.location.href)
    url.searchParams.delete('checkout')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, '', url.pathname)

    // Poll for subscription to appear (webhook may take a moment)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      try {
        const res = await subscriptionsApi.getMySubscription()
        const sub = res.data?.subscription || res.subscription
        if (sub && sub.isActive) {
          setCurrentSubscription(sub)
          setSelectedPremiumTier(sub.tier)
          setPremiumBillingCycle(sub.billingCycle || 'monthly')
          refreshUser?.()
          clearInterval(poll)
        }
      } catch {}
      if (attempts >= 5) clearInterval(poll)
    }, 2000)

    return () => clearInterval(poll)
  }, [])

  const handleValidateCode = async () => {
    if (!discountCode.trim()) return
    setDiscountError('')
    setDiscountResult(null)
    try {
      const res = await subscriptionsApi.validateCode(discountCode.trim())
      const result = res.data || res
      if (result.isValid) {
        setDiscountResult(result)
      } else {
        setDiscountError(result.message || 'Invalid discount code')
      }
    } catch (err) {
      setDiscountError(err.message || 'Failed to validate code')
    }
  }

  const premiumTiers = [
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'Stand out from the crowd',
      price: 10,
      annualPrice: 96,
      icon: 'star',
      accentColor: '#2dd4bf',
      accentGlow: 'rgba(45, 212, 191, 0.15)',
      features: [
        'Premium comments shown first',
        'Premium reviews shown first',
        'Priority visibility on all interactions',
      ],
      badge: null,
    },
    {
      id: 'privacy',
      name: 'Premium Privacy',
      tagline: 'Browse in stealth mode',
      price: 20,
      annualPrice: 192,
      icon: 'shield',
      accentColor: '#a78bfa',
      accentGlow: 'rgba(167, 139, 250, 0.15)',
      features: [
        'Activity details page hidden',
        "Others can't see your likes, comments, or nominations",
      ],
      includesText: 'Everything in Premium',
      badge: 'Most Popular',
    },
    {
      id: 'adfree',
      name: 'Ad Free',
      tagline: 'Pure, uninterrupted experience',
      price: 30,
      annualPrice: 288,
      icon: 'layers',
      accentColor: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.15)',
      features: [
        'Completely ad-free experience',
        'No sponsored content or promotions',
      ],
      includesText: 'Everything in Premium Privacy',
      badge: 'Best Value',
    },
  ]

  const PremiumStarIcon = ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  const PremiumShieldIcon = ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )

  const PremiumLayersIcon = ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )

  const PremiumCheckIcon = ({ color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  const premiumIconMap = { star: PremiumStarIcon, shield: PremiumShieldIcon, layers: PremiumLayersIcon }

  const getPremiumPrice = (tier) => {
    let price = premiumBillingCycle === 'annual' ? Math.round(tier.annualPrice / 12) : tier.price
    if (discountResult?.isValid) {
      price = Math.round(price * (1 - discountResult.discountPercent / 100))
    }
    return `${price}`
  }

  const getPremiumSavings = (tier) => {
    const monthlyCost = tier.price * 12
    const saved = monthlyCost - tier.annualPrice
    return Math.round((saved / monthlyCost) * 100)
  }

  const renderPremiumSection = () => (
    <div style={{
      minHeight: '100%',
      background: '#0a0a0f',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: '#e4e4e7',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'fixed',
        top: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(167, 139, 250, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(10, 10, 15, 0.85)',
      }}>
        <button
          onClick={() => { setActiveSection(null); setSelectedPremiumTier(null); setShowDiscount(false); }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>Premium</span>
      </div>

      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 20px 40px' }}>
        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '14px',
            padding: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['monthly', 'annual'].map((cycle) => (
              <button
                key={cycle}
                onClick={() => setPremiumBillingCycle(cycle)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  transition: 'all 0.25s ease',
                  background: premiumBillingCycle === cycle ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                  color: premiumBillingCycle === cycle ? '#e4e4e7' : '#71717a',
                }}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'annual' && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2dd4bf',
                    fontFamily: "'Space Mono', monospace",
                  }}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {premiumTiers.map((tier, index) => {
            const IconComponent = premiumIconMap[tier.icon]
            const isSelected = selectedPremiumTier === tier.id
            const isPopular = tier.badge === 'Most Popular'

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedPremiumTier(selectedPremiumTier === tier.id ? null : tier.id)}
                style={{
                  position: 'relative',
                  borderRadius: '20px',
                  padding: '2px',
                  background: isSelected
                    ? `linear-gradient(135deg, ${tier.accentColor}40, ${tier.accentColor}10)`
                    : isPopular
                    ? `linear-gradient(135deg, ${tier.accentColor}30, transparent)`
                    : 'rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Badge */}
                {tier.badge && (
                  <div style={{ position: 'absolute', top: '-10px', right: '20px', zIndex: 2 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontFamily: "'Space Mono', monospace",
                      background: isPopular
                        ? `linear-gradient(135deg, ${tier.accentColor}, ${tier.accentColor}cc)`
                        : `${tier.accentColor}20`,
                      color: isPopular ? '#0a0a0f' : tier.accentColor,
                      boxShadow: isPopular ? `0 4px 20px ${tier.accentColor}40` : 'none',
                    }}>
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div style={{
                  borderRadius: '18px',
                  padding: '24px',
                  background: isSelected
                    ? `linear-gradient(145deg, ${tier.accentGlow}, rgba(15, 15, 25, 0.98))`
                    : 'rgba(15, 15, 25, 0.95)',
                  borderLeft: `3px solid ${tier.accentColor}${isSelected ? '' : '40'}`,
                  transition: 'all 0.3s ease',
                }}>
                  {/* Icon + Name + Price row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: `${tier.accentColor}12`,
                        border: `1px solid ${tier.accentColor}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: isSelected ? `0 0 24px ${tier.accentColor}20` : 'none',
                      }}>
                        <IconComponent color={tier.accentColor} />
                      </div>
                      <div>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          margin: 0,
                          letterSpacing: '-0.02em',
                          color: '#f4f4f5',
                        }}>
                          {tier.name}
                        </h3>
                        <p style={{
                          fontSize: '12px',
                          color: tier.accentColor,
                          margin: '2px 0 0',
                          fontWeight: 500,
                          opacity: 0.8,
                        }}>
                          {tier.tagline}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          fontFamily: "'Space Mono', monospace",
                          letterSpacing: '-0.03em',
                          color: '#f4f4f5',
                        }}>
                          {getPremiumPrice(tier)}
                        </span>
                        <span style={{ fontSize: '13px', color: '#52525b', fontWeight: 500 }}>/mo</span>
                      </div>
                      {premiumBillingCycle === 'annual' && (
                        <span style={{
                          fontSize: '11px',
                          color: '#2dd4bf',
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 600,
                        }}>
                          Save {getPremiumSavings(tier)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Includes text */}
                  {tier.includesText && (
                    <p style={{
                      fontSize: '12px',
                      color: '#52525b',
                      margin: '12px 0 0',
                      paddingLeft: '62px',
                      fontStyle: 'italic',
                    }}>
                      {tier.includesText} +
                    </p>
                  )}

                  {/* Features */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '16px',
                    paddingLeft: '62px',
                  }}>
                    {tier.features.map((feature, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flexShrink: 0 }}>
                          <PremiumCheckIcon color={tier.accentColor} />
                        </div>
                        <span style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.4 }}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  {currentSubscription?.isActive && currentSubscription?.tier === tier.id ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelSubscription(); }}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '14px',
                        borderRadius: '14px',
                        border: `1px solid ${tier.accentColor}30`,
                        background: 'transparent',
                        color: tier.accentColor,
                        fontSize: '14px',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        letterSpacing: '-0.01em',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}>
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (isSelected) handleSubscribe(); }}
                      disabled={isSelected && isSubscribing}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '14px',
                        borderRadius: '14px',
                        border: isSelected ? 'none' : `1px solid ${tier.accentColor}30`,
                        background: isSelected
                          ? `linear-gradient(135deg, ${tier.accentColor}, ${tier.accentColor}cc)`
                          : 'transparent',
                        color: isSelected ? '#0a0a0f' : tier.accentColor,
                        fontSize: '14px',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        letterSpacing: '-0.01em',
                        cursor: isSubscribing ? 'wait' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: isSelected ? `0 4px 24px ${tier.accentColor}30` : 'none',
                        opacity: isSubscribing ? 0.6 : 1,
                      }}>
                      {isSelected ? (isSubscribing ? 'Redirecting...' : 'Subscribe Now') : `Get ${tier.name}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Discount code */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          {!showDiscount ? (
            <button
              onClick={() => setShowDiscount(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#52525b',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Have a discount code?
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(''); setDiscountResult(null); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${discountResult?.isValid ? 'rgba(45, 212, 191, 0.3)' : discountError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e4e4e7',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleValidateCode}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #a78bfa, #2dd4bf)',
                    color: '#0a0a0f',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}>
                  Apply
                </button>
              </div>
              {discountResult?.isValid && (
                <p style={{ fontSize: '13px', color: '#2dd4bf', marginTop: '8px' }}>
                  {discountResult.discountPercent}% discount applied!
                </p>
              )}
              {discountError && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '8px' }}>
                  {discountError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Subscription error */}
        {subscriptionError && (
          <p style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#ef4444',
            marginTop: '16px',
          }}>
            {subscriptionError}
          </p>
        )}

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#3f3f46',
          marginTop: '24px',
          lineHeight: 1.5,
        }}>
          Cancel anytime. All plans auto-renew {premiumBillingCycle === 'annual' ? 'annually' : 'monthly'}.
        </p>
      </div>
    </div>
  )

  // Render placeholder section
  const renderPlaceholderSection = (title) => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">{title}</h1>
      </div>
      <div className="placeholder-content">
        <p>Coming soon...</p>
      </div>
    </div>
  )

  // Render Create Party section
  const renderCreatePartySection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection('party')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Create Party</h1>
      </div>
      <div className="placeholder-content">
        <p>Party creation coming soon...</p>
      </div>
    </div>
  )

  // Render Profile Privacy section
  const renderProfilePrivacySection = () => {
    const privacyOptions = ['Public', 'Private']

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Profile Privacy</h1>
        </div>

        <div className="settings-list selection-list">
          {privacyOptions.map(option => (
            <button
              key={option}
              className={`settings-row selection ${editedCandidate.privacy === option ? 'selected' : ''}`}
              onClick={() => {
                setEditedCandidate(prev => ({ ...prev, privacy: option }))
              }}
            >
              <div className="settings-row-left">
                <span className="settings-row-icon">{option === 'Public' ? '🌐' : '🔒'}</span>
                <div className="settings-row-info">
                  <span className="settings-row-label">{option}</span>
                  <span className="settings-row-desc">
                    {option === 'Public'
                      ? 'Anyone can see your profile'
                      : 'Only approved followers can see your profile'}
                  </span>
                </div>
              </div>
              {editedCandidate.privacy === option && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Preview Private Profile Button */}
        <div className="preview-section">
          <button
            className="preview-btn"
            onClick={() => setActiveSection('preview-private-profile')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview Private Profile
          </button>
        </div>
      </div>
    )
  }

  // Render Username section
  const renderUsernameSection = () => {
    const canChange = canChangeUsername()
    const daysLeft = daysUntilUsernameChange()

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Username</h1>
        </div>

        <div className="username-section-content">
          <div className="username-input-container">
            <span className="username-at">@</span>
            <input
              type="text"
              className="username-input"
              placeholder="Enter username"
              value={pendingUsername || editedCandidate.username}
              onChange={(e) => setPendingUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
              disabled={!canChange}
            />
          </div>

          <p className="username-note">
            You can only change your username once every 2 weeks.
            {!canChange && (
              <span className="username-wait"> Wait {daysLeft} more day{daysLeft !== 1 ? 's' : ''}.</span>
            )}
          </p>

          {canChange && pendingUsername && pendingUsername !== editedCandidate.username && (
            <button
              className="username-save-btn"
              onClick={() => setShowUsernameWarning(true)}
            >
              Save Username
            </button>
          )}
        </div>

        {/* Username Change Warning Modal */}
        {showUsernameWarning && (
          <div className="status-warning-overlay" onClick={() => setShowUsernameWarning(false)}>
            <div className="status-warning-modal" onClick={(e) => e.stopPropagation()}>
              <div className="warning-icon">@</div>
              <h3>Change Username?</h3>
              <p>You won't be able to change your username again for 2 weeks. Your old username will become available for others to use.</p>
              <div className="warning-actions">
                <button
                  className="warning-btn cancel"
                  onClick={() => setShowUsernameWarning(false)}
                >
                  Cancel
                </button>
                <button
                  className="warning-btn confirm"
                  onClick={async () => {
                    try {
                      const userId = candidate?.id || currentUser?.id || currentUser?.userId
                      await usersApi.updateUser(userId, { username: pendingUsername })
                      setEditedCandidate(prev => ({ ...prev, username: pendingUsername }))
                      updateUser?.({ username: pendingUsername })
                      onSave?.({ username: pendingUsername })
                      setLastUsernameChange(new Date())
                      setPendingUsername('')
                      setShowUsernameWarning(false)
                      setActiveSection(null)
                      refreshUser?.()
                    } catch (err) {
                      console.error('Failed to update username:', err)
                      alert(err.message?.includes('409') ? 'Username already taken' : 'Failed to update username')
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Races section
  const renderRacesSection = () => {
    const filteredRaces = myRaces.filter(race =>
      race.name.toLowerCase().includes(raceSearch.toLowerCase())
    )

    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => { setActiveSection(null); setRaceSearch(''); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="settings-title">Races</h1>
        </div>

        {/* Search */}
        <div className="settings-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search races"
            value={raceSearch}
            onChange={(e) => setRaceSearch(e.target.value)}
          />
        </div>

        {/* Races List */}
        <div className="races-list">
          {filteredRaces.length > 0 ? (
            filteredRaces.map(race => (
              <button
                key={race.id}
                className="race-item"
                onClick={() => setSelectedRaceDetail(race)}
              >
                <div className="race-item-info">
                  <span className="race-item-name">{race.name}</span>
                  <span className="race-item-type">
                    {race.type}
                  </span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="race-item-chevron">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          ) : (
            <div className="empty-state">
              <p>{raceSearch ? 'No races found' : 'No races yet'}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Private Profile Preview
  const renderPrivateProfilePreview = () => (
    <div className="settings-page private-profile-preview">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection('profile-privacy')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Private Profile Preview</h1>
      </div>

      <div className="private-profile-container">
        {/* Private Profile Mock */}
        <div className="private-profile-mock">
          <div className="private-avatar-section">
            <div className="private-avatar">
              <img src={editedCandidate.avatar || DEFAULT_USER_AVATAR} alt="Profile" />
            </div>
            <h2 className="private-username">{editedCandidate.username || 'Username'}</h2>
            <span className="private-badge">Private Account</span>
          </div>

          <div className="private-stats">
            <div className="private-stat">
              <span className="private-stat-number">--</span>
              <span className="private-stat-label">Posts</span>
            </div>
            <div className="private-stat">
              <span className="private-stat-number">--</span>
              <span className="private-stat-label">Followers</span>
            </div>
            <div className="private-stat">
              <span className="private-stat-number">--</span>
              <span className="private-stat-label">Following</span>
            </div>
          </div>

          <div className="private-message">
            <div className="private-lock-icon">🔒</div>
            <h3>This Account is Private</h3>
            <p>Follow this account to see their photos and videos.</p>
            <button className="private-follow-btn">Follow</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="edit-profile">
      {activeSection === null && renderMainMenu()}
      {activeSection === 'status' && renderStatusSection()}
      {activeSection === 'username' && renderUsernameSection()}
      {activeSection === 'party' && renderPartySection()}
      {activeSection === 'create-party' && renderCreatePartySection()}
      {activeSection === 'profile-privacy' && renderProfilePrivacySection()}
      {activeSection === 'preview-private-profile' && renderPrivateProfilePreview()}
      {activeSection === 'icebreakers' && renderIcebreakersSection()}
      {activeSection === 'races' && renderRacesSection()}
      {activeSection === 'saved' && renderSavedSection()}
      {activeSection === 'blocked' && renderBlockedSection()}
      {activeSection === 'archives' && renderArchivesSection()}
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'silenced' && renderSilencedSection()}
      {activeSection === 'nominations' && renderNominationsSection()}
      {activeSection === 'ballot' && renderPlaceholderSection('My Ballot')}
      {activeSection === 'account' && renderPlaceholderSection('Account')}
      {activeSection === 'premium' && renderPremiumSection()}
      {activeSection === 'security' && renderSecuritySection()}
      {activeSection === 'change-password' && renderChangePasswordSection()}
      {activeSection === 'connected-devices' && renderConnectedDevicesSection()}

      {/* Race Detail Slide-up Modal */}
      {selectedRaceDetail && (
        <>
          <div
            className="race-modal-backdrop"
            onClick={() => setSelectedRaceDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}
          />
          <div
            className="race-modal"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: '440px',
              margin: '0 auto',
              height: '70vh',
              background: 'linear-gradient(180deg, #3D2A1A 0%, #2A1F0F 100%)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 20px 32px',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div className="race-modal-handle" />

            {/* Countdown Timer */}
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

            <div className="race-modal-header">
              <div className="race-modal-title-row">
                <h2 className="race-modal-title">{selectedRaceDetail.name}</h2>
                <div className="race-modal-actions">
                  {selectedRaceDetail.type === 'candidate' ? (
                    <>
                      <button
                        className="race-modal-btn follow"
                        onClick={() => handleUnfollowRace(selectedRaceDetail.id)}
                      >
                        Unfollow
                      </button>
                      <button
                        className="race-modal-btn participate"
                        onClick={() => handleDropOutRace(selectedRaceDetail.id)}
                      >
                        Drop Out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="race-modal-btn follow"
                        onClick={() => handleUnfollowRace(selectedRaceDetail.id)}
                      >
                        Unfollow
                      </button>
                      <button
                        className="race-modal-btn participate"
                        onClick={() => {
                          setMyRaces(prev => prev.map(r =>
                            r.id === selectedRaceDetail.id ? { ...r, type: 'candidate', yourRank: prev.filter(x => x.type === 'candidate').length + 1 } : r
                          ))
                          setSelectedRaceDetail(null)
                        }}
                      >
                        Race
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Race Chart */}
            <div className="race-modal-chart">
              <RaceChart candidates={raceChartData} />
            </div>

            {/* Top Candidates List */}
            <div className="race-contestants-list">
              {raceChartData.map((candidate, idx) => (
                <div key={candidate.id} className="race-contestant-row">
                  <span className="race-contestant-rank">{idx + 1}</span>
                  <img src={candidate.avatar} alt={candidate.name} className="race-contestant-avatar" />
                  <div className="race-contestant-info">
                    <span className="race-contestant-name">{candidate.name}</span>
                    <span className="race-contestant-nominations">{candidate.nominations} nominations</span>
                  </div>
                  <div className="race-contestant-stars">
                    <span className="star-icon">★</span>
                    <span>{candidate.stars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default EditProfile
