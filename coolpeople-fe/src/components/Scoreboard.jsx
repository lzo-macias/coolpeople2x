import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styling/Scoreboard.css'
import ScoreboardUserRow from './ScoreboardUserRow'
import ScoreboardPartyRow from './ScoreboardPartyRow'
import InviteFriends from './InviteFriends'
import { racesApi, favoritesApi, searchApi, partiesApi } from '../services/api'
import { DEFAULT_USER_AVATAR, DEFAULT_PARTY_AVATAR } from '../utils/avatarDefaults'
import { mockScoreboard, mockPartyScoreboard, getPartyColor } from '../data/mockData'

// Mock recommended users
const recommendedUsers = [
  { id: 'rec-1', username: 'william.hiya', avatar: 'https://i.pravatar.cc/100?img=33', party: 'Democrat' },
  { id: 'rec-2', username: 'sarap', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'rec-3', username: 'whatstea', avatar: 'https://i.pravatar.cc/100?img=32', party: null },
  { id: 'rec-4', username: 'periodp', avatar: 'https://i.pravatar.cc/100?img=25', party: 'Green' },
  { id: 'rec-5', username: 'coolcat', avatar: 'https://i.pravatar.cc/100?img=36', party: 'Democrat' },
  { id: 'rec-6', username: 'maya.votes', avatar: 'https://i.pravatar.cc/100?img=41', party: 'Republican' },
  { id: 'rec-7', username: 'joshforchange', avatar: 'https://i.pravatar.cc/100?img=53', party: null },
  { id: 'rec-8', username: 'lucia.2024', avatar: 'https://i.pravatar.cc/100?img=44', party: 'Democrat' },
  { id: 'rec-9', username: 'thereal.mike', avatar: 'https://i.pravatar.cc/100?img=59', party: 'Green' },
  { id: 'rec-10', username: 'votesara', avatar: 'https://i.pravatar.cc/100?img=38', party: 'Republican' },
]

// Mock front runners
const frontRunners = [
  { id: 'fr-2', rank: 2, label: 'Second Place', nominations: '18,000', avatar: 'https://i.pravatar.cc/100?img=11', party: 'Democrat' },
  { id: 'fr-1', rank: 1, label: 'Current Front Runner', nominations: '25,000', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'fr-3', rank: 3, label: 'Third Place', nominations: '15,000', avatar: 'https://i.pravatar.cc/100?img=44', party: null },
]

function Scoreboard({ onOpenProfile, onOpenPartyProfile, isActive, refreshKey = 0, onFavoriteChange, currentUserId, userRacesFollowing = [], userRacesCompeting = [] }) {
  const [users, setUsers] = useState(mockScoreboard)
  const [parties, setParties] = useState(mockPartyScoreboard)
  const [raceScoreboards, setRaceScoreboards] = useState({}) // Store scoreboards per race ID
  const [viewMode, setViewMode] = useState('global') // 'global' or 'local'
  const [activeSection, setActiveSection] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState(null)
  const [listFilter, setListFilter] = useState('all') // 'all' or 'favorited'
  const [pendingUnfavorites, setPendingUnfavorites] = useState(new Set()) // Track recently unfavorited users
  const [isExpanded, setIsExpanded] = useState(false) // Track if section is expanded beyond 8 rows
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) // Track if race dropdown is open
  const [isLoading, setIsLoading] = useState(false)
  const [races, setRaces] = useState([]) // Available races from API
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ people: [], races: [] })
  const swipeRef = useRef({ startX: 0, accumulatedDelta: 0 })

  // Fetch scoreboard data from API for all races
  useEffect(() => {
    const fetchScoreboard = async () => {
      if (!isActive) return
      setIsLoading(true)
      try {
        const racesResponse = await racesApi.listRaces()
        if (racesResponse.data && racesResponse.data.length > 0) {
          setRaces(racesResponse.data)

          // Find CoolPeople and Best Party races
          const coolPeopleRace = racesResponse.data.find(r => r.title?.toLowerCase() === 'coolpeople')
          const bestPartyRace = racesResponse.data.find(r => r.title?.toLowerCase() === 'best party')

          // Fetch scoreboards for all races we need
          const racesToFetch = [
            coolPeopleRace,
            bestPartyRace,
            ...userRacesFollowing,
            ...userRacesCompeting
          ].filter(Boolean).filter((race, index, self) =>
            self.findIndex(r => r.id === race.id) === index
          )

          const scoreboardPromises = racesToFetch.map(async (race) => {
            try {
              const scoreboardResponse = await racesApi.getScoreboard(race.id, { limit: 20, period: '7d' })
              return { race, data: scoreboardResponse.data || [] }
            } catch (err) {
              return { race, data: [] }
            }
          })

          const scoreboards = await Promise.all(scoreboardPromises)
          const newRaceScoreboards = {}

          scoreboards.forEach(sb => {
            const { race, data } = sb
            console.log('[Scoreboard] Raw scoreboard data for race:', race?.title, data)
            if (race && data.length > 0) {
              if (race.raceType === 'PARTY_VS_PARTY') {
                newRaceScoreboards[race.id] = {
                  isPartyRace: true,
                  data: data.map((entry, idx) => ({
                    ...entry,
                    rank: idx + 1,
                    partyId: entry.party?.id || entry.id,
                    partyName: entry.party?.name || entry.name,
                    color: entry.party?.color || '#e91e8c',
                    avatar: entry.party?.avatarUrl || entry.avatarUrl || DEFAULT_PARTY_AVATAR,
                    members: entry.party?.memberCount || entry.memberCount || 0,
                    score: entry.totalPoints || 0,
                    change: entry.change || 0,
                    sparklineData: entry.sparkline?.map(s => s.points) || [],
                    isFavorited: entry.isFavorited || entry.isFollowing || false,
                  }))
                }
                // Set parties for Best Party section
                if (race.id === bestPartyRace?.id) {
                  setParties(newRaceScoreboards[race.id].data)
                }
              } else {
                newRaceScoreboards[race.id] = {
                  isPartyRace: false,
                  data: data.map((entry, idx) => ({
                    ...entry,
                    rank: idx + 1,
                    userId: entry.user?.id || entry.id,
                    username: entry.user?.username || entry.username,
                    avatar: entry.user?.avatarUrl || entry.avatarUrl || DEFAULT_USER_AVATAR,
                    party: entry.user?.party?.name || entry.party,
                    partyId: entry.user?.party?.id || null,
                    score: entry.totalPoints,
                    sparklineData: entry.sparkline?.map(s => s.points) || [],
                    isFavorited: entry.isFavorited || entry.isFollowing || false,
                  }))
                }
                // Set users for CoolPeople section
                if (race.id === coolPeopleRace?.id) {
                  setUsers(newRaceScoreboards[race.id].data)
                }
              }
            }
          })

          setRaceScoreboards(newRaceScoreboards)
          console.log('[Scoreboard] Fetched scoreboards:', newRaceScoreboards)
        }
      } catch (error) {
        console.log('Using mock scoreboard data:', error.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchScoreboard()
  }, [isActive, refreshKey, userRacesFollowing, userRacesCompeting])

  // Handle search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ people: [], races: [] })
      return
    }

    const searchTimer = setTimeout(async () => {
      try {
        const response = await searchApi.search(searchQuery)
        if (response.data) {
          setSearchResults({
            people: response.data.users || [],
            races: response.data.races || [],
          })
        }
      } catch (error) {
        console.log('Search error:', error.message)
      }
    }, 300) // Debounce search

    return () => clearTimeout(searchTimer)
  }, [searchQuery])

  // Close search when navigating away and clear pending unfavorites
  useEffect(() => {
    if (!isActive) {
      setIsSearchOpen(false)
      setPendingUnfavorites(new Set())
      setSearchQuery('')
    }
  }, [isActive])

  // Clear pending unfavorites and collapse when section changes
  useEffect(() => {
    setPendingUnfavorites(new Set())
    setIsExpanded(false)
  }, [activeSection])

  // Clear pending unfavorites when switching between All/Favorited
  useEffect(() => {
    setPendingUnfavorites(new Set())
  }, [listFilter])

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

  // Find CoolPeople and Best Party race IDs from the races list
  const coolPeopleRace = races.find(r => r.title?.toLowerCase() === 'coolpeople')
  const bestPartyRace = races.find(r => r.title?.toLowerCase() === 'best party')

  // Define sections dynamically based on user's races
  // Always show CoolPeople and Best Party, then add user's followed/competing races
  const sections = (() => {
    const result = [
      {
        id: coolPeopleRace?.id || 'coolpeople',
        label: 'CoolPeople',
        users: raceScoreboards[coolPeopleRace?.id]?.data || frontrunnerUsers,
        isPartyRace: false
      },
      {
        id: bestPartyRace?.id || 'bestparty',
        label: 'Best Party',
        users: raceScoreboards[bestPartyRace?.id]?.data || parties,
        isPartyRace: true
      },
    ]

    // Combine user's following and competing races, removing duplicates and the base races
    const userRaces = [...userRacesFollowing, ...userRacesCompeting]
      .filter((race, index, self) =>
        // Remove duplicates by id
        self.findIndex(r => r.id === race.id) === index &&
        // Exclude CoolPeople and Best Party (already included)
        race.title?.toLowerCase() !== 'coolpeople' &&
        race.title?.toLowerCase() !== 'best party'
      )

    // Add all user's followed/competing races (no cap)
    userRaces.forEach(race => {
      const scoreboard = raceScoreboards[race.id]
      result.push({
        id: race.id,
        label: race.title,
        users: scoreboard?.data || [],
        isPartyRace: scoreboard?.isPartyRace || race.raceType === 'PARTY_VS_PARTY',
      })
    })

    console.log('[Scoreboard] raceScoreboards:', raceScoreboards)
    console.log('[Scoreboard] sections:', result)
    console.log('[Scoreboard] sections.length:', result.length, '> 5?', result.length > 5)

    return result
  })()

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

  const handleToggleFavorite = async (userId) => {
    const user = users.find(u => u.userId === userId)
    const newFavoritedState = !user?.isFavorited

    // If we're in favorited view and unfavoriting, add to pending unfavorites
    if (listFilter === 'favorited' && user?.isFavorited) {
      setPendingUnfavorites(prev => new Set([...prev, userId]))
    }

    // If we're re-favoriting a pending unfavorite, remove from pending
    if (pendingUnfavorites.has(userId)) {
      setPendingUnfavorites(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }

    // Optimistic update - update both users state and raceScoreboards
    setUsers(users.map(u =>
      u.userId === userId
        ? { ...u, isFavorited: newFavoritedState }
        : u
    ))

    // Also update raceScoreboards for immediate UI feedback
    setRaceScoreboards(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(raceId => {
        if (updated[raceId]?.data) {
          updated[raceId] = {
            ...updated[raceId],
            data: updated[raceId].data.map(item =>
              item.userId === userId
                ? { ...item, isFavorited: newFavoritedState }
                : item
            )
          }
        }
      })
      return updated
    })

    // Sync with API
    try {
      if (user?.isFavorited) {
        await favoritesApi.removeFavorite(userId)
      } else {
        await favoritesApi.addFavorite(userId)
      }
      // Notify parent about favorite change for global cache update
      onFavoriteChange?.(userId, user?.username, newFavoritedState)
    } catch (error) {
      // Revert on error
      console.log('Favorite toggle error:', error.message)
      setUsers(users.map(u =>
        u.userId === userId
          ? { ...u, isFavorited: user?.isFavorited }
          : u
      ))
      setRaceScoreboards(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(raceId => {
          if (updated[raceId]?.data) {
            updated[raceId] = {
              ...updated[raceId],
              data: updated[raceId].data.map(item =>
                item.userId === userId
                  ? { ...item, isFavorited: user?.isFavorited }
                  : item
              )
            }
          }
        })
        return updated
      })
    }
  }

  const handleTogglePartyFavorite = async (partyId) => {
    const party = parties.find(p => p.partyId === partyId)
    const newFavoritedState = !party?.isFavorited

    // If we're in favorited view and unfavoriting, add to pending unfavorites
    if (listFilter === 'favorited' && party?.isFavorited) {
      setPendingUnfavorites(prev => new Set([...prev, partyId]))
    }

    // If we're re-favoriting a pending unfavorite, remove from pending
    if (pendingUnfavorites.has(partyId)) {
      setPendingUnfavorites(prev => {
        const newSet = new Set(prev)
        newSet.delete(partyId)
        return newSet
      })
    }

    // Optimistic update - update both parties state and raceScoreboards
    setParties(parties.map(p =>
      p.partyId === partyId
        ? { ...p, isFavorited: newFavoritedState }
        : p
    ))

    // Also update raceScoreboards for immediate UI feedback
    setRaceScoreboards(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(raceId => {
        if (updated[raceId]?.data && updated[raceId]?.isPartyRace) {
          updated[raceId] = {
            ...updated[raceId],
            data: updated[raceId].data.map(item =>
              item.partyId === partyId
                ? { ...item, isFavorited: newFavoritedState }
                : item
            )
          }
        }
      })
      return updated
    })

    // Sync with API - use party follow/unfollow for favorites
    try {
      if (party?.isFavorited) {
        await partiesApi.unfollowParty(partyId)
      } else {
        await partiesApi.followParty(partyId)
      }
    } catch (error) {
      // 409 = already following (when trying to follow) - treat as success
      // 404 = not following (when trying to unfollow) - treat as success
      const isAlreadyInDesiredState =
        (error.message?.includes('409') && !party?.isFavorited) ||
        (error.message?.includes('404') && party?.isFavorited)

      if (!isAlreadyInDesiredState) {
        // Revert on actual error
        console.log('Party favorite toggle error:', error.message)
        setParties(parties.map(p =>
          p.partyId === partyId
            ? { ...p, isFavorited: party?.isFavorited }
            : p
        ))
        setRaceScoreboards(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(raceId => {
            if (updated[raceId]?.data && updated[raceId]?.isPartyRace) {
              updated[raceId] = {
                ...updated[raceId],
                data: updated[raceId].data.map(item =>
                  item.partyId === partyId
                    ? { ...item, isFavorited: party?.isFavorited }
                    : item
                )
              }
            }
          })
          return updated
        })
      }
      // If already in desired state, keep the optimistic update
    }
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
          {isSearchOpen ? (
            <button className="search-cancel" onClick={() => setIsSearchOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              className="view-toggle"
              onClick={() => setViewMode(viewMode === 'global' ? 'local' : 'global')}
            >
              switch to {viewMode === 'global' ? 'local' : 'global'}
            </button>
          )}
        </div>

        {isSearchOpen && (
          <>
            <div className="search-backdrop" onClick={() => setIsSearchOpen(false)} />
            <div className="search-dropdown">
              <div className="search-tags-scroll">
                {['Trending', 'People', 'Races', 'Posts', 'CoolPeople', 'Restaurants', 'Events', 'Parties'].map(tag => (
                  <button
                    key={tag}
                    className={`search-tag ${searchFilter === tag || (searchFilter === null && tag === 'Trending') ? 'active' : ''}`}
                    onClick={() => setSearchFilter(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* People Search Results */}
              {searchFilter === 'People' && (
                <div className="search-people-list">
                  {[
                    { id: 1, username: 'william.hiya', name: 'William Harrison', avatar: 'https://i.pravatar.cc/60?img=12', party: 'Democrat', followers: '25.3K' },
                    { id: 2, username: 'sarah.politics', name: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/60?img=5', party: 'Republican', followers: '18.7K' },
                    { id: 3, username: 'alex.progressive', name: 'Alex Martinez', avatar: 'https://i.pravatar.cc/60?img=3', party: null, followers: '42.1K' },
                    { id: 4, username: 'lzo.macias', name: 'Lzo Macias', avatar: 'https://i.pravatar.cc/60?img=1', party: 'The Pink Lady Party', followers: '89.5K' },
                    { id: 5, username: 'mike.district4', name: 'Mike Thompson', avatar: 'https://i.pravatar.cc/60?img=8', party: 'Green', followers: '12.4K' },
                  ].map(person => (
                    <div key={person.id} className="search-person-row">
                      <div
                        className="search-person-avatar-ring"
                        style={{ borderColor: getPartyColor(person.party) }}
                      >
                        <img src={person.avatar} alt={person.username} className="search-person-avatar" />
                      </div>
                      <div className="search-person-info">
                        <span className="search-person-username">{person.username}</span>
                        <span className="search-person-name">{person.name}</span>
                        <span className="search-person-party">{person.party || 'Independent'}</span>
                      </div>
                      <div className="search-person-followers">{person.followers}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Races Search Results */}
              {searchFilter === 'Races' && (
                <div className="search-races-list">
                  {[
                    { id: 1, name: 'CoolPeople', candidates: 156, followers: '1.2M', avatar: 'https://i.pravatar.cc/80?img=68' },
                    { id: 2, name: 'Mayor Race', candidates: 12, followers: '845K', avatar: 'https://i.pravatar.cc/80?img=60' },
                    { id: 3, name: 'The Pink Lady', candidates: 89, followers: '2.1M', avatar: 'https://i.pravatar.cc/80?img=47' },
                    { id: 4, name: 'Baddest Bitch', candidates: 234, followers: '3.5M', avatar: 'https://i.pravatar.cc/80?img=45' },
                    { id: 5, name: 'City Council', candidates: 45, followers: '320K', avatar: 'https://i.pravatar.cc/80?img=52' },
                    { id: 6, name: 'Governor', candidates: 8, followers: '1.8M', avatar: 'https://i.pravatar.cc/80?img=57' },
                  ].map(race => (
                    <div key={race.id} className="search-race-row">
                      <img src={race.avatar} alt={race.name} className="search-race-icon" />
                      <div className="search-race-info">
                        <span className="search-race-name">{race.name}</span>
                        <span className="search-race-meta">{race.candidates} candidates • {race.followers} followers</span>
                      </div>
                      <button className="search-race-follow">Follow</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Default Grid (Trending or other filters) */}
              {(searchFilter === null || searchFilter === 'Trending' || (searchFilter !== 'People' && searchFilter !== 'Races')) && (
                <div className="search-grid">
                  {[
                    { id: 1, caption: 'need a new colombian man im bored', user: 'whyfelipe', avatar: 'https://i.pravatar.cc/40?img=11', likes: '485', party: 'Democrat' },
                    { id: 2, caption: 'Clean eating for beginners', user: 'Qaim Hunt', avatar: 'https://i.pravatar.cc/40?img=12', likes: '47.8K', party: 'Republican' },
                    { id: 3, caption: 'I love picking my baby boogers and she never le...', user: 'lrn', avatar: 'https://i.pravatar.cc/40?img=13', likes: '160.7K', party: null },
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
                              {!post.isParty && (
                                <span className="search-grid-party">{post.party || 'Independent'}</span>
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
              )}
            </div>
          </>
        )}
      </div>

      {/* Header */}
      <div className="scoreboard-header">
        <h1 className="scoreboard-title">Scoreboard</h1>
        <p className="scoreboard-date">{dateString}</p>
      </div>

      {/* Users sections with horizontal swipe */}
      <div className="users-sections-container">
        <div className="section-header">
          <div className="section-header-top">
            <span className="section-title">{sections[activeSection].label}</span>
            <div className="section-nav">
              {sections.length > 5 ? (
                <div
                  className="section-dots clickable"
                  onClick={() => {
                    console.log('[Scoreboard] Dots clicked, opening modal')
                    setIsDropdownOpen(true)
                  }}
                >
                  {sections.slice(0, 5).map((_, index) => (
                    <span
                      key={index}
                      className={`section-dot ${activeSection === index ? 'active' : ''}`}
                    />
                  ))}
                  <span className="section-dot-more">+{sections.length - 5}</span>
                </div>
              ) : (
                <div className="section-dots">
                  {sections.slice(0, 5).map((_, index) => (
                    <span
                      key={index}
                      className={`section-dot ${activeSection === index ? 'active' : ''}`}
                      onClick={() => setActiveSection(index)}
                    />
                  ))}
                </div>
              )}
              {isDropdownOpen && createPortal(
                <>
                  <div className="races-overlay-backdrop" onClick={() => setIsDropdownOpen(false)} />
                  <div className="races-overlay-grid">
                    {sections.map((section, index) => {
                      const race = [...userRacesFollowing, ...userRacesCompeting].find(r => r.id === section.id)
                      const isPartyRace = section.isPartyRace || race?.raceType === 'PARTY_VS_PARTY'
                      const competitorCount = race?.competitorCount || section.users?.length || 0
                      const isDefaultRace = section.label === 'CoolPeople' || section.label === 'Best Party'
                      return (
                        <div
                          key={section.id}
                          className={`races-overlay-card ${activeSection === index ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSection(index)
                            setIsDropdownOpen(false)
                          }}
                        >
                          <span className="races-overlay-card-name">{section.label}</span>
                          <span className="races-overlay-card-count">{competitorCount} competitors</span>
                          <span className={`races-overlay-card-tag ${isPartyRace ? 'party' : 'user'}`}>
                            {isPartyRace ? 'Party' : 'User'}
                          </span>
                          {!isDefaultRace && (
                            <button
                              className="races-overlay-card-unfollow"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await racesApi.unfollowRace(section.id)
                                  // Trigger refresh by closing overlay
                                  setIsDropdownOpen(false)
                                } catch (err) {
                                  console.log('Unfollow error:', err)
                                }
                              }}
                            >
                              Unfollow
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
          <div className="list-filter-toggle">
            <button
              className={`filter-btn ${listFilter === 'all' ? 'active' : ''}`}
              onClick={() => setListFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${listFilter === 'favorited' ? 'active' : ''}`}
              onClick={() => setListFilter('favorited')}
            >
              Favorited
            </button>
          </div>
        </div>
        <div className="sections-content" onWheel={handleSwipe}>
          {(() => {
            const currentSection = sections[activeSection]
            const isPartyRace = currentSection.isPartyRace

            // Apply list filter (all vs favorited)
            // When in favorited view, also include pending unfavorites
            const idField = isPartyRace ? 'partyId' : 'userId'
            const filteredItems = listFilter === 'favorited'
              ? currentSection.users.filter(item => item.isFavorited || pendingUnfavorites.has(item[idField]))
              : currentSection.users

            if (filteredItems.length === 0) {
              return (
                <div className="section-empty">
                  {listFilter === 'favorited'
                    ? `No favorited ${isPartyRace ? 'parties' : 'users'}`
                    : `No ${isPartyRace ? 'parties' : 'users'} in this section`}
                </div>
              )
            }

            const MAX_VISIBLE = 8
            const hasMore = filteredItems.length > MAX_VISIBLE
            const visibleItems = isExpanded ? filteredItems : filteredItems.slice(0, MAX_VISIBLE)

            return (
              <>
                {visibleItems.map((item, index) => (
                  isPartyRace ? (
                    <ScoreboardPartyRow
                      key={item.partyId}
                      party={item}
                      rank={index + 1}
                      onToggleFavorite={handleTogglePartyFavorite}
                      onOpenProfile={(party) => onOpenPartyProfile?.({ id: party.partyId, name: party.partyName || party.name })}
                      showLoadMore={hasMore && index === visibleItems.length - 1}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(!isExpanded)}
                    />
                  ) : (
                    <ScoreboardUserRow
                      key={item.userId}
                      user={item}
                      rank={index + 1}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenProfile={onOpenProfile}
                      onPartyClick={onOpenPartyProfile}
                      showLoadMore={hasMore && index === visibleItems.length - 1}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(!isExpanded)}
                      isOwnProfile={item.userId === currentUserId}
                    />
                  )
                ))}
              </>
            )
          })()}
        </div>
      </div>

      {/* Invite Friends */}
      <InviteFriends />

      {/* Recommended for you - hidden for now
      <div className="recommended-container">
        <h3 className="recommended-title">Recommended for you</h3>
        <div className="recommended-scroll">
          {recommendedUsers.map(user => (
            <div key={user.id} className="recommended-item">
              <div className="recommended-avatar">
                <img src={user.avatar} alt={user.username} />
              </div>
              <span className="recommended-username">{user.username}</span>
            </div>
          ))}
        </div>
      </div>
      */}

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
