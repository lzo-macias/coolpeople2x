import { useState, useEffect } from 'react'
import '../styling/PartyProfile.css'
import { getPartyColor } from '../data/mockData'
import EditBio from './EditBio'
import SinglePostView from './SinglePostView'
import { partiesApi, reelsApi } from '../services/api'

// CoolPeople Tier System
const CP_TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#CD7F32', icon: '/icons/tiers/dark/bronze.svg' },
  { name: 'Silver', min: 1000, max: 2499, color: '#C0C0C0', icon: '/icons/tiers/dark/silver.svg' },
  { name: 'Gold', min: 2500, max: 4999, color: '#FFD700', icon: '/icons/tiers/dark/gold.svg' },
  { name: 'Diamond', min: 5000, max: 9999, color: '#B9F2FF', icon: '/icons/tiers/dark/diamond.svg' },
  { name: 'Master', min: 10000, max: 24999, color: '#9B59B6', icon: '/icons/tiers/dark/master.svg' },
  { name: 'Challenger', min: 25000, max: Infinity, color: '#FF4500', icon: '/icons/tiers/dark/challenger.svg' },
]

const getCurrentTier = (points) => {
  return CP_TIERS.find(tier => points >= tier.min && points <= tier.max) || CP_TIERS[0]
}

const getNextTier = (points) => {
  const currentIndex = CP_TIERS.findIndex(tier => points >= tier.min && points <= tier.max)
  return currentIndex < CP_TIERS.length - 1 ? CP_TIERS[currentIndex + 1] : null
}

// Helper to format numbers for display
const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Helper to format relative time
const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// eslint-disable-next-line no-unused-vars
function PartyProfile({ party: passedParty, onMemberClick, onOpenComments, isOwnParty = false, isPremium = false }) {
  // State for fetched data
  const [partyData, setPartyData] = useState(null)
  const [members, setMembers] = useState([])
  const [followers, setFollowers] = useState([])
  const [races, setRaces] = useState([])
  const [reviews, setReviews] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(null)

  // Fetch all party data on mount
  useEffect(() => {
    const fetchPartyData = async () => {
      if (!passedParty?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Fetch all data in parallel
        const [profileRes, membersRes, followersRes, racesRes, reviewsRes, postsRes] = await Promise.all([
          partiesApi.getFullProfile(passedParty.id).catch(() => null),
          partiesApi.getMembers(passedParty.id).catch(() => ({ data: [] })),
          partiesApi.getFollowers(passedParty.id).catch(() => ({ data: [] })),
          partiesApi.getRaces(passedParty.id).catch(() => ({ data: { races: [] } })),
          partiesApi.getReviews(passedParty.id).catch(() => ({ data: [], averageRating: null })),
          reelsApi.getPartyReels(passedParty.id).catch(() => ({ data: [] })),
        ])

        if (profileRes?.data?.party) {
          setPartyData(profileRes.data.party)
        }

        console.log('PartyProfile: membersRes:', membersRes)
        console.log('PartyProfile: membersRes?.data:', membersRes?.data)
        setMembers(membersRes?.data || [])
        setFollowers(followersRes?.data || [])
        setRaces(racesRes?.data?.races || [])
        setReviews(reviewsRes?.data || [])
        setAverageRating(reviewsRes?.averageRating || null)
        setPosts(postsRes?.data || [])
      } catch (err) {
        console.error('Error fetching party data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPartyData()
  }, [passedParty?.id])

  // Merge fetched data with passed party, prefer fetched data
  const party = {
    ...passedParty,
    ...(partyData || {}),
    avatar: partyData?.avatarUrl || passedParty?.avatar || passedParty?.avatarUrl,
  }

  // Check if this is a new party (just created)
  const isNewParty = party.isNewParty ||
    (partyData?.memberCount === 1 && partyData?.followerCount === 0) ||
    (members.length <= 1 && followers.length === 0 && reviews.length === 0)

  // Get CP points from fetched stats
  const partyCpPoints = partyData?.stats?.cpPoints ?? party.stats?.cpPoints ?? party.cpPoints ?? 0

  // Build race data from fetched races
  const partyRaceData = races.reduce((acc, race) => {
    acc[race.raceName] = {
      cpPoints: race.totalPoints,
      change: race.change,
      tier: race.tier.charAt(0) + race.tier.slice(1).toLowerCase()
    }
    return acc
  }, {})

  // Ensure Best Party exists with default values if no races
  if (!partyRaceData['Best Party'] && Object.keys(partyRaceData).length === 0) {
    partyRaceData['Best Party'] = {
      cpPoints: partyCpPoints,
      change: partyData?.stats?.change || '+0.00',
      tier: partyData?.stats?.tier?.charAt(0) + (partyData?.stats?.tier?.slice(1).toLowerCase() || '') || 'Bronze'
    }
  }

  // Get race names for pills
  const raceNames = races.length > 0 ? races.map(r => r.raceName) : ['Best Party']

  // Format members for display
  const formattedMembers = members.map(m => ({
    id: m.id,
    username: m.username,
    avatar: m.avatarUrl || 'https://i.pravatar.cc/40',
    party: party.name,
    role: m.permissions?.includes('leader') ? 'Leader' : m.permissions?.includes('admin') ? 'Admin' : m.permissions?.includes('moderate') ? 'Moderator' : 'Member',
    joinedAt: formatRelativeTime(m.joinedAt),
  }))

  // Debug log members
  if (members.length > 0 || formattedMembers.length > 0) {
    console.log('PartyProfile: members state:', members)
    console.log('PartyProfile: formattedMembers:', formattedMembers)
  }

  // Format races for display
  const formattedRaces = races.map(r => ({
    id: r.id,
    name: r.raceName,
    position: r.position,
    percentile: r.position ? `${(r.position / 100).toFixed(1)}%` : null,
    isWon: r.position === 1,
    isRunning: true,
    isFollowing: false,
    color: r.isSystemRace ? '#FF2A55' : '#00F2EA',
  }))

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedRace, setSelectedRace] = useState(raceNames[0] || 'Best Party') // currently selected race filter
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFavorited, setIsFavorited] = useState(party.isFavorited || false)

  // Sync isFollowing with fetched data
  useEffect(() => {
    if (partyData?.isFollowing !== undefined) {
      setIsFollowing(partyData.isFollowing)
    }
  }, [partyData?.isFollowing])
  const [hasJoined, setHasJoined] = useState(partyData?.isMember || false)

  // Sync hasJoined with fetched data
  useEffect(() => {
    if (partyData?.isMember !== undefined) {
      setHasJoined(partyData.isMember)
    }
  }, [partyData?.isMember])
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditBio, setShowEditBio] = useState(false)
  const [editInitialSection, setEditInitialSection] = useState(null)
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [cpCardExpanded, setCpCardExpanded] = useState(false)
  const [showAllVerifiedReviews, setShowAllVerifiedReviews] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showRacesModal, setShowRacesModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [communityTestimonials, setCommunityTestimonials] = useState([])

  // Update community testimonials when reviews load
  useEffect(() => {
    // Format reviews for display
    const formatted = reviews.map(r => ({
      id: r.id,
      user: {
        id: r.author.id,
        username: r.author.username,
        avatar: r.author.avatarUrl || 'https://i.pravatar.cc/40',
        party: r.author.partyName,
      },
      text: r.content,
      rating: r.rating,
      timestamp: formatRelativeTime(r.createdAt),
      media: null,
      isPaid: false,
      replies: r.replies || [],
    }))
    setCommunityTestimonials(formatted)
  }, [reviews])
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseText, setResponseText] = useState('')
  // eslint-disable-next-line no-unused-vars
  const [reviewResponses, setReviewResponses] = useState({}) // Used by response modal

  // Use real data for modals, with fallbacks for empty states
  const partyMembers = formattedMembers.length > 0 ? formattedMembers : []
  const partyRacesList = formattedRaces.length > 0 ? formattedRaces : []

  const [partyFollowersState, setPartyFollowersState] = useState([])

  // Update followers state when data loads
  useEffect(() => {
    // Format followers for display
    const formatted = followers.map(f => ({
      id: f.id,
      userId: f.userId,
      username: f.username,
      avatar: f.avatarUrl || 'https://i.pravatar.cc/40',
      party: f.partyName,
      isFollowing: f.isFollowing || false,
    }))
    setPartyFollowersState(formatted)
  }, [followers])

  // Get all posts for this party (fetched or passed)
  const allPosts = posts.length > 0 ? posts : (party.posts || [])

  // Handle post click to open SinglePostView
  const handlePostClick = (index) => {
    setSelectedPostIndex(index)
    setShowSinglePost(true)
  }

  // Handle like change from SinglePostView - updates local post state immediately
  const handlePostLikeChange = (reelId, liked) => {
    setPosts(prev => prev.map(post => {
      if (post.id === reelId) {
        const currentCount = parseInt(String(post.stats?.likes || post.likeCount || '0').replace(/,/g, '')) || 0
        const newCount = liked ? currentCount + 1 : Math.max(0, currentCount - 1)
        return {
          ...post,
          isLiked: liked,
          likeCount: newCount,
          stats: {
            ...post.stats,
            likes: newCount.toLocaleString()
          }
        }
      }
      return post
    }))
  }

  // Handle comment added - updates local post state immediately
  const handlePostCommentAdded = (reelId) => {
    setPosts(prev => prev.map(post => {
      if (post.id === reelId) {
        const currentCount = parseInt(String(post.stats?.comments || post.commentCount || '0').replace(/,/g, '')) || 0
        return {
          ...post,
          commentCount: currentCount + 1,
          stats: {
            ...post.stats,
            comments: (currentCount + 1).toLocaleString()
          }
        }
      }
      return post
    }))
  }

  // Profile sections state for icebreakers
  // New parties start with empty icebreakers, established parties have content
  const defaultIcebreakers = isNewParty ? {
    viewsOnIce: null,
    viewsOnTransRights: null,
    viewsOnHealthcare: null,
    viewsOnGunControl: null,
    hillToDieOn: null,
    topicsThatEnergize: { title: 'Topics that energize us', tags: [] },
    accomplishment: null,
    guessWhichTrue: { title: 'Guess Which One is True', options: ['', '', ''], correctIndex: null },
    customWritten: [],
    customSliders: [],
  } : {
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
  }

  const [profileSections, setProfileSections] = useState(party.icebreakers || defaultIcebreakers)

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

  // Show loading skeleton while fetching
  if (loading && !passedParty?.name) {
    return (
      <div className="party-profile">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading party...</p>
        </div>
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
              <div className="stat-item clickable" onClick={() => setShowMembersModal(true)}>
                <span className="stat-number">{formatNumber(partyData?.memberCount || members.length || 1)}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="stat-item clickable" onClick={() => setShowFollowersModal(true)}>
                <span className="stat-number">{formatNumber(partyData?.followerCount || followers.length || 0)}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item clickable" onClick={() => setShowRacesModal(true)}>
                <span className="stat-number">{partyData?.stats?.raceCount || races.length || 1}</span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  <img src={getCurrentTier(partyCpPoints).icon} alt={getCurrentTier(partyCpPoints).name} className="stat-tier-icon" />
                </span>
                <span className="stat-label">{getCurrentTier(partyCpPoints).name}</span>
              </div>
            </div>
            <p className="profile-bio">{party.bio || ''}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {isOwnParty ? (
            // Owner with edit permissions
            <>
              <button className="profile-action-btn share">share</button>
              <button className="profile-action-btn edit" onClick={() => setShowEditBio(true)}>edit</button>
              <button className="profile-action-dots">
                <span></span>
                <span></span>
                <span></span>
              </button>
            </>
          ) : hasJoined ? (
            // Member without edit permissions
            <>
              <button className="profile-action-btn promotion">ask for promotion</button>
              <button className="profile-action-btn share">share</button>
              <button className="profile-action-dots">
                <span></span>
                <span></span>
                <span></span>
              </button>
            </>
          ) : (
            // Not a member
            <>
              <button className="profile-action-btn join" onClick={async () => {
                if (party.id) {
                  try {
                    await partiesApi.joinParty(party.id)
                    setHasJoined(true)
                  } catch (err) {
                    console.error('Failed to join party:', err)
                  }
                }
              }}>
                join
              </button>
              <button
                className={`profile-action-btn follow ${isFollowing ? 'following' : ''}`}
                onClick={async () => {
                  if (party.id) {
                    try {
                      if (isFollowing) {
                        await partiesApi.unfollowParty(party.id)
                      } else {
                        await partiesApi.followParty(party.id)
                      }
                      setIsFollowing(!isFollowing)
                    } catch (err) {
                      console.error('Failed to toggle follow:', err)
                    }
                  }
                }}
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
            </>
          )}
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
          // Get race-specific data - use party data for new parties
          const currentRaceData = partyRaceData[selectedRace] || partyRaceData['Best Party']
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
                      <img src={currentTier.icon} alt={currentTier.name} className="tier-svg-icon" />
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
                    <img src={currentTier.icon} alt={currentTier.name} className="tier-icon-mini" />
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
                      <img src={currentTier.icon} alt={currentTier.name} className="progress-tier-icon" />
                      {currentTier.name}
                    </div>
                    <div className="next">{pointsToNext.toLocaleString()} CP to <img src={nextTier.icon} alt={nextTier.name} className="progress-tier-icon" /> {nextTier.name}</div>
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
        {raceNames.length > 1 && (
          <div className="tag-pills-container">
            <div className="tag-pills">
              {raceNames.map((race) => (
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
            <span className="cp-section-label verified">VERIFIED REVIEWS</span>
          </div>

          {averageRating && (
            <div className="chart-rating-badge below-verified">
              <span className="rating-value">{averageRating.toFixed(1)}</span>
              <div className="rating-star-circle">
                <svg className="rating-star" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
          )}

          {/* Testimonials - or empty state for new parties */}
          {communityTestimonials.length === 0 && !loading && (
            <div className="empty-reviews-state">
              <span className="empty-reviews-text">0 reviews yet</span>
            </div>
          )}
          {communityTestimonials.length > 0 && (showAllVerifiedReviews ? communityTestimonials : communityTestimonials.slice(0, 3)).map((testimonial) => (
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

          {/* Load More / Load Less Verified Reviews */}
          {communityTestimonials.length > 3 && (
            <div
              className="load-more-buttons verified-reviews"
              onClick={() => setShowAllVerifiedReviews(!showAllVerifiedReviews)}
            >
              <button className="load-more-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showAllVerifiedReviews ? (
                    <>
                      <polyline points="18 18 12 12 6 18"></polyline>
                      <polyline points="18 12 12 6 6 12"></polyline>
                    </>
                  ) : (
                    <>
                      <polyline points="6 6 12 12 18 6"></polyline>
                      <polyline points="6 12 12 18 18 12"></polyline>
                    </>
                  )}
                </svg>
              </button>
              <button className="load-more-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showAllVerifiedReviews ? (
                    <>
                      <polyline points="18 18 12 12 6 18"></polyline>
                      <polyline points="18 12 12 6 6 12"></polyline>
                    </>
                  ) : (
                    <>
                      <polyline points="6 6 12 12 18 6"></polyline>
                      <polyline points="6 12 12 18 18 12"></polyline>
                    </>
                  )}
                </svg>
              </button>
            </div>
          )}

          {/* Leave a Verified Review link - always gradient for verified section */}
          <button className="leave-review-link verified" onClick={() => setShowPaywall(true)}>
            Leave a Verified Review
          </button>

          {/* Leave a Review link - shown when there are reviews */}
          <p className="leave-review-text" onClick={() => setShowReviewModal(true)} style={{ cursor: 'pointer' }}>Leave a Review</p>
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
        {(getOrderedIcebreakers().length > 0 || isOwnParty) && (
          <div className="profile-sections">
            <div className="profile-sections-header">
              <span className="profile-sections-title">Icebreakers</span>
              {isOwnParty && getOrderedIcebreakers().length > 0 && (
                <button
                  className="icebreakers-edit-btn"
                  onClick={() => {
                    setEditInitialSection('icebreakers')
                    setShowEditBio(true)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
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

            {/* Add icebreakers button - always shown for owners */}
            {isOwnParty && (
              <button
                className="add-icebreakers-link"
                onClick={() => {
                  setEditInitialSection('icebreakers')
                  setShowEditBio(true)
                }}
              >
                add icebreakers
              </button>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* Edit Bio Overlay - for development */}
      {showEditBio && (
        <div className="edit-bio-overlay">
          <button className="edit-bio-close" onClick={() => {
            setShowEditBio(false)
            setEditInitialSection(null)
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <EditBio
            profileData={profileSections}
            onSave={handleSaveProfile}
            initialSection={editInitialSection}
          />
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
          onOpenComments={(post) => onOpenComments?.(post, handlePostCommentAdded)}
          onLikeChange={handlePostLikeChange}
          profileName={party.name}
        />
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="stat-modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Members</h3>
              <button className="stat-modal-close" onClick={() => setShowMembersModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {partyMembers.length === 0 ? (
                <div className="stat-modal-empty">No members yet</div>
              ) : partyMembers.map((member) => (
                <div
                  key={member.id}
                  className="stat-modal-row clickable"
                  onClick={() => { setShowMembersModal(false); onMemberClick?.(member); }}
                >
                  <div className="stat-row-user">
                    <div className="stat-row-avatar-ring" style={{ borderColor: partyColor }}>
                      <img src={member.avatar} alt={member.username} className="stat-row-avatar" />
                    </div>
                    <div className="stat-row-info">
                      <span className="stat-row-username">{member.username}</span>
                      <span className="stat-row-meta">{member.role} · {member.joinedAt}</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="stat-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Followers</h3>
              <button className="stat-modal-close" onClick={() => setShowFollowersModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {partyFollowersState.length === 0 ? (
                <div className="stat-modal-empty">No followers yet</div>
              ) : partyFollowersState.map((follower) => (
                <div key={follower.id} className="stat-modal-row">
                  <div
                    className="stat-row-user clickable"
                    onClick={() => { setShowFollowersModal(false); onMemberClick?.(follower); }}
                  >
                    <div className="stat-row-avatar-ring" style={{ borderColor: getPartyColor(follower.party) }}>
                      <img src={follower.avatar} alt={follower.username} className="stat-row-avatar" />
                    </div>
                    <span className="stat-row-username">{follower.username}</span>
                  </div>
                  <button
                    className={`stat-row-follow-btn ${follower.isFollowing ? 'following' : ''}`}
                    onClick={() => {
                      setPartyFollowersState(prev => prev.map(f =>
                        f.id === follower.id ? { ...f, isFollowing: !f.isFollowing } : f
                      ))
                    }}
                  >
                    {follower.isFollowing ? 'following' : 'follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Races Modal */}
      {showRacesModal && (
        <div className="stat-modal-overlay" onClick={() => setShowRacesModal(false)}>
          <div className="stat-modal races" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Races</h3>
              <button className="stat-modal-close" onClick={() => setShowRacesModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {partyRacesList.length === 0 ? (
                <div className="stat-modal-empty">Not competing in any races yet</div>
              ) : null}
              {/* Won Races - at the top, green */}
              {partyRacesList.filter(r => r.isWon).map((race) => (
                <div key={race.id} className="stat-modal-row race-row won">
                  <div className="race-row-info">
                    <div className="race-row-indicator won"></div>
                    <span className="race-row-name">{race.name}</span>
                  </div>
                  <span className="race-row-position won">Winner</span>
                </div>
              ))}

              {/* Running Races - color coded */}
              {partyRacesList.filter(r => r.isRunning && !r.isWon).map((race) => (
                <div
                  key={race.id}
                  className="stat-modal-row race-row clickable"
                  onClick={() => { setShowRacesModal(false); /* TODO: navigate to race */ }}
                >
                  <div className="race-row-info">
                    <div className="race-row-indicator" style={{ backgroundColor: race.color }}></div>
                    <span className="race-row-name">{race.name}</span>
                  </div>
                  <div className="race-row-stats">
                    <span className="race-row-position">#{race.position}</span>
                    {race.percentile && <span className="race-row-percentile">{race.percentile}</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="paywall-overlay" onClick={() => setShowPaywall(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>
            <div className="paywall-icon">🔒</div>
            <h3 className="paywall-title">Verified Reviews</h3>
            <p className="paywall-text">
              Leaving verified reviews is a premium feature. Upgrade to share your verified experience with this party.
            </p>
            <button className="paywall-btn">Upgrade Now</button>
          </div>
        </div>
      )}

      {/* Leave a Review Modal */}
      {showReviewModal && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <button className="review-modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            <h3 className="review-modal-title">Leave a Review</h3>
            <div className="review-modal-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`review-star ${reviewRating >= star ? 'filled' : ''}`}
                  onClick={() => setReviewRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              className="review-modal-textarea"
              placeholder="Share your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <button
              className="review-modal-submit"
              onClick={() => {
                if (reviewText.trim() && reviewRating > 0) {
                  const newReview = {
                    id: `member-${Date.now()}`,
                    user: {
                      username: 'You',
                      avatar: 'https://i.pravatar.cc/40?img=68',
                      party: null,
                    },
                    text: reviewText,
                    rating: reviewRating,
                    timestamp: 'Just now',
                    media: null,
                  }
                  setCommunityTestimonials([newReview, ...communityTestimonials])
                }
                setShowReviewModal(false)
                setReviewText('')
                setReviewRating(0)
              }}
            >
              Submit Review
            </button>
          </div>
        </div>
      )}

      {/* Response Modal for Community Reviews */}
      {respondingTo && (
        <div className="response-modal-overlay" onClick={() => { setRespondingTo(null); setResponseText(''); }}>
          <div className="response-modal" onClick={(e) => e.stopPropagation()}>
            <div className="response-modal-header">
              <button className="response-close-btn" onClick={() => { setRespondingTo(null); setResponseText(''); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <h3>Respond to Review</h3>
              <button
                className="response-post-btn"
                disabled={!responseText.trim()}
                onClick={() => {
                  setReviewResponses(prev => ({
                    ...prev,
                    [respondingTo.id]: responseText
                  }))
                  setRespondingTo(null)
                  setResponseText('')
                }}
              >
                Post
              </button>
            </div>

            {/* Original Review */}
            <div className="response-original-review">
              <div className="response-review-header">
                <img
                  src={respondingTo.user.avatar}
                  alt={respondingTo.user.username}
                  className="response-reviewer-avatar"
                />
                <span className="response-reviewer-name">{respondingTo.user.username}</span>
                <span className="response-review-time">{respondingTo.timestamp}</span>
              </div>
              {respondingTo.text && (
                <p className="response-review-text">{respondingTo.text}</p>
              )}
              <div className="response-review-rating">
                {renderStars(respondingTo.rating)}
              </div>
            </div>

            {/* Response Input */}
            <div className="response-input-container">
              <textarea
                className="response-textarea"
                placeholder="Write your response..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PartyProfile
