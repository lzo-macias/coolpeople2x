import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styling/EditProfile.css'
import '../styling/ReelCard.css'
import EditBio from './EditBio'

function EditProfile({ candidate, profileSections, onSave, onClose }) {
  const [activeSection, setActiveSection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showStatusWarning, setShowStatusWarning] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [partySearch, setPartySearch] = useState('')
  const [raceSearch, setRaceSearch] = useState('')
  const [selectedRaceDetail, setSelectedRaceDetail] = useState(null)
  const [editedCandidate, setEditedCandidate] = useState({
    username: candidate?.username || '',
    bio: candidate?.bio || '',
    avatar: candidate?.avatar || '',
    party: candidate?.party || 'Independent',
    status: 'Candidate',
    privacy: 'Public',
  })

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

  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
    raceUpdates: true,
    partyNews: false,
    promotions: false,
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

  const blockedUsers = [
    { id: 1, username: 'toxic_troll', avatar: 'https://i.pravatar.cc/150?img=10' },
    { id: 2, username: 'spammer99', avatar: 'https://i.pravatar.cc/150?img=20' },
    { id: 3, username: 'rude_dude', avatar: 'https://i.pravatar.cc/150?img=30' },
  ]

  const silencedUsers = [
    { id: 1, username: 'annoying_poster', avatar: 'https://i.pravatar.cc/150?img=40' },
    { id: 2, username: 'too_much_drama', avatar: 'https://i.pravatar.cc/150?img=50' },
  ]

  const parties = [
    { name: 'Independent', color: '#888888' },
    { name: 'Democrat', color: '#3B82F6' },
    { name: 'Republican', color: '#EF4444' },
    { name: 'The Pink Lady', color: '#EC4899' },
    { name: 'Green Party', color: '#22C55E' },
    { name: 'Libertarian', color: '#F59E0B' },
  ]

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
    { id: 1, name: 'William H.', avatar: 'https://i.pravatar.cc/40?img=12', nominations: '25,000', stars: 4.8 },
    { id: 2, name: 'Sarah J.', avatar: 'https://i.pravatar.cc/40?img=5', nominations: '18,500', stars: 4.5 },
    { id: 3, name: 'Alex M.', avatar: 'https://i.pravatar.cc/40?img=3', nominations: '15,200', stars: 4.3 },
    { id: 4, name: 'Mike T.', avatar: 'https://i.pravatar.cc/40?img=8', nominations: '12,800', stars: 4.1 },
    { id: 5, name: 'Jordan P.', avatar: 'https://i.pravatar.cc/40?img=14', nominations: '9,400', stars: 3.9 },
  ]

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
    const party = parties.find(p => p.name === partyName)
    return party?.color || '#888888'
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
        <h1 className="settings-title">Settings and Configuration</h1>
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
        <div className="settings-avatar-container">
          {editedCandidate.avatar ? (
            <img src={editedCandidate.avatar} alt="Profile" className="settings-avatar" />
          ) : (
            <div className="settings-avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="12" cy="10" r="3" />
                <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
              </svg>
            </div>
          )}
        </div>
        <button className="edit-picture-link">edit profile picture</button>
      </div>

      {/* Status, Username & Party */}
      <div className="settings-profile-info">
        <button className="settings-row" onClick={() => setActiveSection('status')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">✊</span>
            <span className="settings-row-label">Status</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.status}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('username')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">@</span>
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

        <button className="settings-row" onClick={() => setActiveSection('party')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">👥</span>
            <span className="settings-row-label">Party</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.party}</span>
            <span
              className="party-color-dot"
              style={{ background: getPartyColor(editedCandidate.party) }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('icebreakers')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">🧊</span>
            <span className="settings-row-label">Icebreakers</span>
          </div>
          <div className="settings-row-right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('races')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">🏁</span>
            <span className="settings-row-label">Races</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{myRaces.length}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button
          className={`settings-row ${editedCandidate.status === 'Candidate' ? 'disabled' : ''}`}
          onClick={() => editedCandidate.status !== 'Candidate' && setActiveSection('profile-privacy')}
        >
          <div className="settings-row-left">
            <span className="settings-row-icon">🔒</span>
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
      </div>

      {/* Other User Settings */}
      <div className="settings-section">
        <button className="settings-section-header">
          <span>other user settings</span>
        </button>

        <div className="settings-list">
          <button className="settings-row slim" onClick={() => setActiveSection('saved')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">📑</span>
              <span className="settings-row-label">Saved</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('blocked')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🚫</span>
              <span className="settings-row-label">Blocked</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('archives')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">📦</span>
              <span className="settings-row-label">Archives</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('notifications')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🔔</span>
              <span className="settings-row-label">Notifications</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('silenced')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🔇</span>
              <span className="settings-row-label">Silenced</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* CoolPeople Tools */}
      <div className="settings-section">
        <button className="settings-section-header">
          <span>coolpeople tools</span>
        </button>

        <div className="settings-list">
          <button className="settings-row slim" onClick={() => setActiveSection('nominations')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">📋</span>
              <span className="settings-row-label">My Nominations</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('ballot')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🗳️</span>
              <span className="settings-row-label">My Ballot</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Account & Privacy */}
      <div className="settings-section">
        <button className="settings-section-header">
          <span>account & privacy</span>
        </button>

        <div className="settings-list">
          <button className="settings-row slim" onClick={() => setActiveSection('account')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">👤</span>
              <span className="settings-row-label">Account</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('privacy')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🔒</span>
              <span className="settings-row-label">Privacy</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row slim" onClick={() => setActiveSection('security')}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🛡️</span>
              <span className="settings-row-label">Security</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger">
        <div className="settings-list">
          <button className="settings-row slim danger" onClick={() => {}}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🚪</span>
              <span className="settings-row-label">Log Out</span>
            </div>
          </button>

          <button className="settings-row slim danger delete" onClick={() => {}}>
            <div className="settings-row-left">
              <span className="settings-row-icon">🗑️</span>
              <span className="settings-row-label">Delete Account</span>
            </div>
          </button>
        </div>
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
                    setEditedCandidate(prev => ({ ...prev, status: pendingStatus }))
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
      party.name.toLowerCase().includes(partySearch.toLowerCase())
    )

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
          {filteredParties.map(party => (
            <button
              key={party.name}
              className={`settings-row selection ${editedCandidate.party === party.name ? 'selected' : ''}`}
              onClick={() => {
                setEditedCandidate(prev => ({ ...prev, party: party.name }))
                setPartySearch('')
                setActiveSection(null)
              }}
            >
              <div className="settings-row-left">
                <span className="party-color-dot" style={{ background: party.color }} />
                <span className="settings-row-label">{party.name}</span>
              </div>
              {editedCandidate.party === party.name && (
                <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
          {filteredParties.length === 0 && (
            <div className="no-results">No parties found</div>
          )}
        </div>
      </div>
    )
  }

  // Render Icebreakers section
  const renderIcebreakersSection = () => (
    <div className="settings-page icebreakers-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
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
            setActiveSection(null)
          }}
        />
      </div>
      <div className="icebreakers-save-footer">
        <button className="icebreakers-save-btn" onClick={() => setActiveSection(null)}>
          Save
        </button>
      </div>
    </div>
  )

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
    const allEnabled = Object.values(notifications).every(v => v)

    const toggleAll = () => {
      const newValue = !allEnabled
      setNotifications({
        likes: newValue,
        comments: newValue,
        follows: newValue,
        mentions: newValue,
        messages: newValue,
        raceUpdates: newValue,
        partyNews: newValue,
        promotions: newValue,
      })
    }

    const notificationLabels = {
      likes: 'Likes',
      comments: 'Comments',
      follows: 'New Followers',
      mentions: 'Mentions',
      messages: 'Direct Messages',
      raceUpdates: 'Race Updates',
      partyNews: 'Party News',
      promotions: 'Promotions',
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
            <button className={`toggle-btn ${allEnabled ? 'on' : ''}`} onClick={toggleAll}>
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="notification-divider" />

          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="notification-item">
              <span className="notification-label">{notificationLabels[key]}</span>
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
                  onClick={() => {
                    setEditedCandidate(prev => ({ ...prev, username: pendingUsername }))
                    setLastUsernameChange(new Date())
                    setPendingUsername('')
                    setShowUsernameWarning(false)
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
              <img src={editedCandidate.avatar || 'https://i.pravatar.cc/150?img=12'} alt="Profile" />
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
      {activeSection === 'archives' && renderPlaceholderSection('Archives')}
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'silenced' && renderSilencedSection()}
      {activeSection === 'nominations' && renderPlaceholderSection('My Nominations')}
      {activeSection === 'ballot' && renderPlaceholderSection('My Ballot')}
      {activeSection === 'account' && renderPlaceholderSection('Account')}
      {activeSection === 'privacy' && renderPlaceholderSection('Privacy')}
      {activeSection === 'security' && renderPlaceholderSection('Security')}

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
