import { useState, useRef, useEffect } from 'react'
import '../styling/Scoreboard.css'
import ScoreboardUserRow from './ScoreboardUserRow'
import ScoreboardChart from './ScoreboardChart'
import { mockScoreboard, getPartyColor } from '../data/mockData'

// Mock recommended users
const recommendedUsers = [
  { id: 'rec-1', username: 'william.hiya', avatar: 'https://i.pravatar.cc/100?img=33', party: 'Democrat' },
  { id: 'rec-2', username: 'sarap', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'rec-3', username: 'whatstea', avatar: 'https://i.pravatar.cc/100?img=32', party: 'Independent' },
  { id: 'rec-4', username: 'periodp', avatar: 'https://i.pravatar.cc/100?img=25', party: 'Green' },
  { id: 'rec-5', username: 'coolcat', avatar: 'https://i.pravatar.cc/100?img=36', party: 'Democrat' },
]

// Mock front runners
const frontRunners = [
  { id: 'fr-2', rank: 2, label: 'Second Place', nominations: '18,000', avatar: 'https://i.pravatar.cc/100?img=11', party: 'Democrat' },
  { id: 'fr-1', rank: 1, label: 'Current Front Runner', nominations: '25,000', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'fr-3', rank: 3, label: 'Third Place', nominations: '15,000', avatar: 'https://i.pravatar.cc/100?img=44', party: 'Independent' },
]

function Scoreboard({ onOpenProfile, isActive }) {
  const [users, setUsers] = useState(mockScoreboard)
  const [timePeriod, setTimePeriod] = useState('this month')
  const [viewMode, setViewMode] = useState('global') // 'global' or 'local'
  const [activeSection, setActiveSection] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const swipeRef = useRef({ startX: 0, accumulatedDelta: 0 })

  // Close search when navigating away
  useEffect(() => {
    if (!isActive) {
      setIsSearchOpen(false)
    }
  }, [isActive])

  // Mock current user's party (null if not in a party)
  const currentUserParty = 'Democrat'

  const today = new Date()
  const dateString = `${today.getDate()} of ${today.toLocaleString('en-US', { month: 'long' }).toLowerCase()}`

  const favoritedUsers = users.filter(u => u.isFavorited)

  // Frontrunners - sorted by score (highest first)
  const frontrunnerUsers = [...users].sort((a, b) => {
    const scoreA = typeof a.score === 'number' ? a.score : parseFloat(String(a.score).replace(/,/g, ''))
    const scoreB = typeof b.score === 'number' ? b.score : parseFloat(String(b.score).replace(/,/g, ''))
    return scoreB - scoreA
  }).slice(0, 10)

  // Nominated users (users who have been nominated)
  const nominatedUsers = users.filter(u => {
    const score = typeof u.score === 'number' ? u.score : parseFloat(String(u.score || 0).replace(/,/g, ''))
    return score > 0
  })

  // Party users (same party as current user)
  const partyUsers = currentUserParty
    ? users.filter(u => u.party === currentUserParty)
    : []

  // Define sections
  const sections = [
    { id: 'favorited', label: 'Favorited Users', users: favoritedUsers },
    { id: 'frontrunners', label: 'Frontrunners', users: frontrunnerUsers },
    { id: 'nominated', label: 'Nominated', users: nominatedUsers },
  ]

  // Add party section if user is in a party
  if (currentUserParty) {
    sections.push({ id: 'party', label: `${currentUserParty} Party`, users: partyUsers })
  }

  const handleSwipe = (e) => {
    // Accumulate horizontal scroll delta
    swipeRef.current.accumulatedDelta += e.deltaX

    // Threshold for triggering a swipe
    const threshold = 50

    if (swipeRef.current.accumulatedDelta > threshold) {
      // Swipe left - go to next section
      if (activeSection < sections.length - 1) {
        setActiveSection(activeSection + 1)
      }
      swipeRef.current.accumulatedDelta = 0
    } else if (swipeRef.current.accumulatedDelta < -threshold) {
      // Swipe right - go to previous section
      if (activeSection > 0) {
        setActiveSection(activeSection - 1)
      }
      swipeRef.current.accumulatedDelta = 0
    }
  }

  const handleToggleFavorite = (userId) => {
    setUsers(users.map(user =>
      user.userId === userId
        ? { ...user, isFavorited: !user.isFavorited }
        : user
    ))
  }

  return (
    <div className="scoreboard-page">
      {/* Search row / Search dropdown */}
      <div className="scoreboard-search-row">
        <div className="search-bar-container">
          <div className={`search-bar ${isSearchOpen ? 'expanded' : ''}`} onClick={() => !isSearchOpen && setIsSearchOpen(true)}>
            <img src="/icons/bottomnavbar/darkmode/explore-icon-darkmode.svg" alt="Search" className="search-bar-icon" />
            {isSearchOpen && (
              <input type="text" placeholder="Search..." className="search-bar-input" autoFocus onClick={(e) => e.stopPropagation()} />
            )}
          </div>
          {isSearchOpen && (
            <button className="search-cancel" onClick={() => setIsSearchOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isSearchOpen && (
          <>
            <div className="search-backdrop" onClick={() => setIsSearchOpen(false)} />
            <div className="search-dropdown">
              <div className="search-tags-scroll">
                <button className="search-tag trending">Trending</button>
                {['People', 'Posts', 'CoolPeople', 'Restaurants', 'Events', 'Parties'].map(tag => (
                  <button key={tag} className="search-tag">{tag}</button>
                ))}
              </div>

              <div className="search-grid">
                {[
                  { id: 1, caption: 'need a new colombian man im bored', user: 'whyfelipe', avatar: 'https://i.pravatar.cc/40?img=11', likes: '485', party: 'Democrat' },
                  { id: 2, caption: 'Clean eating for beginners', user: 'Qaim Hunt', avatar: 'https://i.pravatar.cc/40?img=12', likes: '47.8K', party: 'Republican' },
                  { id: 3, caption: 'I love picking my baby boogers and she never le...', user: 'lrn', avatar: 'https://i.pravatar.cc/40?img=13', likes: '160.7K', party: 'Independent' },
                  { id: 4, caption: "couldn't believe my eyes", user: 'natalia', avatar: 'https://i.pravatar.cc/40?img=14', likes: '413.5K', party: 'Green' },
                  { id: 5, caption: 'POV: you finally found your people', user: 'Democratic Party', avatar: 'https://i.pravatar.cc/40?img=15', likes: '22.1K', isParty: true },
                  { id: 6, caption: 'This is what democracy looks like', user: 'CoolPeople Official', avatar: 'https://i.pravatar.cc/40?img=16', likes: '89.2K', isParty: true },
                ].map(post => (
                  <div key={post.id} className="search-grid-item">
                    <img src={`https://picsum.photos/200/350?random=${post.id}`} alt="" className="search-grid-thumb" />
                    <div className="search-grid-info">
                      <p className="search-grid-caption">{post.caption}</p>
                      <div className="search-grid-meta">
                        <div className="search-grid-user">
                          <img src={post.avatar} alt={post.user} className="search-grid-avatar" />
                          <div className="search-grid-user-info">
                            <span className="search-grid-username">{post.user}</span>
                            {!post.isParty && post.party && (
                              <span className="search-grid-party">{post.party}</span>
                            )}
                          </div>
                        </div>
                        <div className="search-grid-likes">
                          <span className="heart-icon">♡</span>
                          {post.likes}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Header */}
      <div className="scoreboard-header">
        <div className="scoreboard-header-left">
          <h1 className="scoreboard-title">Scoreboard</h1>
          <p className="scoreboard-date">{dateString}</p>
        </div>
        <button
          className="view-toggle"
          onClick={() => setViewMode(viewMode === 'global' ? 'local' : 'global')}
        >
          switch to {viewMode === 'global' ? 'local' : 'global'}
        </button>
      </div>

      {/* Users sections with horizontal swipe */}
      <div className="users-sections-container">
        <div className="section-header">
          <span className="section-title">{sections[activeSection].label}</span>
          <div className="section-dots">
            {sections.map((_, index) => (
              <span
                key={index}
                className={`section-dot ${activeSection === index ? 'active' : ''}`}
                onClick={() => setActiveSection(index)}
              />
            ))}
          </div>
        </div>
        <div className="sections-content" onWheel={handleSwipe}>
          {sections[activeSection].users.length > 0 ? (
            sections[activeSection].users.map(user => (
              <ScoreboardUserRow
                key={user.userId}
                user={user}
                onToggleFavorite={handleToggleFavorite}
                onOpenProfile={onOpenProfile}
              />
            ))
          ) : (
            <div className="section-empty">No users in this section</div>
          )}
        </div>
      </div>

      {/* Time period dropdown */}
      <div className="time-period-selector">
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className="time-period-dropdown"
        >
          <option value="this week">this week</option>
          <option value="this month">this month</option>
          <option value="this year">this year</option>
          <option value="all time">all time</option>
        </select>
      </div>

      {/* Chart */}
      <ScoreboardChart users={users} />

      {/* Recommended for you */}
      <div className="recommended-section">
        <h3 className="recommended-title">Recommended for you</h3>
        <div className="recommended-scroll">
          {recommendedUsers.map(user => (
            <div key={user.id} className="recommended-user">
              <div
                className="recommended-avatar-ring"
                style={{ borderColor: getPartyColor(user.party) }}
              >
                <img src={user.avatar} alt={user.username} className="recommended-avatar" />
              </div>
              <span className="recommended-username">{user.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CoolPeople Title */}
      {/* <h1 className="coolpeople-title">CoolPeople</h1> */}

      {/* Current Front Runner Section */}
      {/* <div className="front-runner-section">
        {frontRunners.map(runner => (
          <div
            key={runner.id}
            className={`front-runner-item ${runner.rank === 1 ? 'front-runner-first' : 'front-runner-other'}`}
          >
            <div
              className="front-runner-avatar-ring"
              style={{ borderColor: getPartyColor(runner.party) }}
            >
              <img src={runner.avatar} alt={runner.username} className="front-runner-avatar" />
              {runner.rank === 1 && <span className="front-runner-badge">1</span>}
            </div>
            <span className="front-runner-label">{runner.label}</span>
            <span className="front-runner-nominations">{runner.nominations} Nominations</span>
          </div>
        ))}
      </div> */}
    </div>
  )
}

export default Scoreboard
