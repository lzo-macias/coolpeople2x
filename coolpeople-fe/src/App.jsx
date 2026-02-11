import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './styling/App.css'
import './styling/Auth.css'
import NominationStories from './components/NominationStories'
import NominationCard from './components/NominationCard'
import InviteFriends from './components/InviteFriends'
import ReelCard from './components/ReelCard'
import BottomNav from './components/BottomNav'
import CommentsSection from './components/CommentsSection'
import Scoreboard from './components/Scoreboard'
import CandidateProfile from './components/CandidateProfile'
import PartyProfile from './components/PartyProfile'
import ParticipantProfile from './components/ParticipantProfile'
import ExplorePage from './components/ExplorePage'
import MyProfile from './components/MyProfile'
import MyBallot from './components/MyBallot'
import Messages from './components/Messages'
import Conversation from './components/Conversation'
import CreateScreen from './components/CreateScreen'
import SinglePostView from './components/SinglePostView'
import Login from './components/Login'
import Register from './components/Register'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { reelsApi, messagesApi, partiesApi, storiesApi, usersApi, groupchatsApi, racesApi } from './services/api'
import { initializeSocket, onFollowUpdate, disconnectSocket } from './services/socket'
import { mockReels, mockConversations, mockMessages } from './data/mockData'
import { selectEngagementForReel, normalizeScoreboardEntry } from './services/engagementRelevance'

// Pages: 0 = Scoreboard, 1 = Home/Reels, 2 = Search, 3 = Messages, 4 = Campaign/Ballot, 5 = Profile
const PAGES = ['scoreboard', 'home', 'search', 'messages', 'campaign', 'profile']

function AppContent() {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const { user: authUser, isAuthenticated, loading: authLoading, refreshUser, updateUser } = useAuth()
  const [authView, setAuthView] = useState('login') // 'login' or 'register'
  const [currentPage, setCurrentPage] = useState(1) // Start on home
  const [showComments, setShowComments] = useState(false)
  const [activeReel, setActiveReel] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [activeCandidate, setActiveCandidate] = useState(null)
  const [showPartyProfile, setShowPartyProfile] = useState(false)
  const [activeParty, setActiveParty] = useState(null)
  const [showParticipantProfile, setShowParticipantProfile] = useState(false)
  const [activeParticipant, setActiveParticipant] = useState(null)
  const [isOwnParticipantProfile, setIsOwnParticipantProfile] = useState(false)
  const [isInConversation, setIsInConversation] = useState(false)
  const [showCreateScreen, setShowCreateScreen] = useState(false)
  const [createScreenSound, setCreateScreenSound] = useState(null)
  const [hasBallotNotification, setHasBallotNotification] = useState(true)
  const [userParty, setUserParty] = useState(null) // User's created party
  const [canEnterPartyInRaces, setCanEnterPartyInRaces] = useState(false) // Whether user can enter their party into races (leader/admin)
  const [hasOptedIn, setHasOptedIn] = useState(false) // Whether user has opted into social credit
  const [customAvatar, setCustomAvatar] = useState(null) // User's custom profile photo
  const [userBio, setUserBio] = useState('') // User's bio text
  const [userFollowing, setUserFollowing] = useState('0') // Number of users being followed
  const [userFollowers, setUserFollowers] = useState('0') // Number of followers
  const [userRacesFollowing, setUserRacesFollowing] = useState([]) // Races user is following
  const [userRacesCompeting, setUserRacesCompeting] = useState([]) // Races user is competing in (candidates only)
  const [userPoints, setUserPoints] = useState([]) // User's points per race (candidates only)
  const [reels, setReels] = useState([...mockReels]) // All posts in feed - fallback to mock
  const [userPosts, setUserPosts] = useState([]) // Current user's posts
  const [userReposts, setUserReposts] = useState([]) // Current user's reposts
  const [partyPosts, setPartyPosts] = useState([]) // Posts to user's party
  const [userStories, setUserStories] = useState([]) // User's stories (nominations)
  const [conversations, setConversations] = useState({ ...mockConversations }) // Chat messages by conversation ID
  const [userActivity, setUserActivity] = useState([]) // Track all user actions for details page
  const [isLoading, setIsLoading] = useState(false)
  const [partyProfiles, setPartyProfiles] = useState({}) // Party profiles cache (populated from API)
  const [userProfilesCache, setUserProfilesCache] = useState({}) // Centralized user profiles cache
  const [scoreboardRefreshKey, setScoreboardRefreshKey] = useState(0) // Triggers scoreboard refetch when changed
  const [conversationsRefreshKey, setConversationsRefreshKey] = useState(0) // Triggers conversations refetch
  const [messageTargetUser, setMessageTargetUser] = useState(null) // User to start conversation with
  const [showConversationOverlay, setShowConversationOverlay] = useState(false) // Show conversation as overlay
  const [overlayConversation, setOverlayConversation] = useState(null) // Conversation data for overlay
  const [navHistory, setNavHistory] = useState([])
  const [showSinglePostView, setShowSinglePostView] = useState(false) // Show reel in scrollable view
  const [singlePostViewData, setSinglePostViewData] = useState(null) // { posts, initialIndex }
  const [topEngagedCandidates, setTopEngagedCandidates] = useState([]) // Top candidates for sparklines (fallback)
  const [engagementRaceName, setEngagementRaceName] = useState('CoolPeople') // Race name for engagement bars (fallback)
  const [allRaceScoreboards, setAllRaceScoreboards] = useState({}) // All race scoreboards for per-reel relevance

  // Refs must also be at the top
  const reelsFeedRef = useRef(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const profileOverlayRef = useRef(null)

  // useEffects for data fetching
  useEffect(() => {
    const fetchReels = async () => {
      if (!isAuthenticated) return
      setIsLoading(true)
      try {
        const response = await reelsApi.getFeed()
        if (response.data && response.data.length > 0) {
          setReels(response.data)
        }
      } catch (error) {
        console.log('Using mock reels data:', error.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReels()
  }, [isAuthenticated])

  useEffect(() => {
    const fetchConversations = async () => {
      if (!isAuthenticated) return
      try {
        const response = await messagesApi.getConversations()
        if (response.data && response.data.length > 0) {
          const convMap = {}
          response.data.forEach(conv => {
            convMap[conv.id] = conv.messages || []
          })
          setConversations(convMap)
        }
      } catch (error) {
        console.log('Using mock conversations:', error.message)
      }
    }
    fetchConversations()
  }, [isAuthenticated, conversationsRefreshKey])

  // Callback to refresh conversations (e.g., after joining a party)
  const refreshConversations = () => {
    setConversationsRefreshKey(prev => prev + 1)
  }

  useEffect(() => {
    const fetchStories = async () => {
      if (!isAuthenticated) return
      try {
        const response = await storiesApi.getFeed()
        const feedData = response.data?.storyFeed || response.data || []
        if (Array.isArray(feedData) && feedData.length > 0) {
          setUserStories(feedData)
        }
      } catch (error) {
        console.log('Using mock stories:', error.message)
      }
    }
    fetchStories()
  }, [isAuthenticated])

  // Fetch all race scoreboards for per-reel engagement relevance
  useEffect(() => {
    const fetchAllScoreboards = async () => {
      if (!isAuthenticated) return
      try {
        const racesResponse = await racesApi.listRaces()
        const races = racesResponse.data || []

        if (races.length === 0) throw new Error('No races available')

        // Fetch scoreboards for all races in parallel (cap at 20)
        const scoreboards = {}
        const results = await Promise.allSettled(
          races.slice(0, 20).map(async (race) => {
            const res = await racesApi.getScoreboard(race.id, { limit: 10, period: '7d' })
            return { race, data: res.data || [] }
          })
        )

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            const { race, data } = result.value
            scoreboards[race.title] = {
              raceId: race.id,
              raceName: race.title,
              entries: data.map((entry, idx) => normalizeScoreboardEntry(entry, idx, null)),
            }
          }
        })

        // Count total candidates across all scoreboards
        const totalCandidates = Object.values(scoreboards).reduce((sum, sb) => sum + (sb.entries?.length || 0), 0)
        if (totalCandidates < 4) {
          // Not enough candidates from API for variety — fall through to fallback
          throw new Error('Too few scoreboard candidates for variety')
        }

        setAllRaceScoreboards(scoreboards)

        // Set CoolPeople (or first race) as default fallback
        const defaultRace = races.find(r => r.title === 'CoolPeople') || races[0]
        if (defaultRace) {
          setEngagementRaceName(defaultRace.title || 'CoolPeople')
          const defaultEntries = scoreboards[defaultRace.title]?.entries || []
          if (defaultEntries.length > 0) {
            setTopEngagedCandidates(defaultEntries.slice(0, 3))
          }
        }
      } catch (error) {
        console.log('Using default engagement scores:', error.message)
        // Build a fallback pool across multiple mock races so the
        // relevance engine can still rotate candidates per reel
        const fallbackPool = {
          'CoolPeople': {
            raceId: 'race-coolpeople',
            raceName: 'CoolPeople',
            entries: [
              { id: 'eng-cp-1', userId: 'cp-1', username: 'Top.Candidate', avatar: 'https://i.pravatar.cc/40?img=12', party: 'Democrat', sparklineData: [], recentChange: '+12', changeValue: 12, trend: 'up', totalPoints: 4200 },
              { id: 'eng-cp-2', userId: 'cp-2', username: 'Rising.Star', avatar: 'https://i.pravatar.cc/40?img=5', party: 'Republican', sparklineData: [], recentChange: '+8', changeValue: 8, trend: 'up', totalPoints: 3800 },
              { id: 'eng-cp-3', userId: 'cp-3', username: 'Local.Leader', avatar: 'https://i.pravatar.cc/40?img=3', party: 'Independent', sparklineData: [], recentChange: null, changeValue: 0, trend: 'stable', totalPoints: 3100 },
              { id: 'eng-cp-4', userId: 'cp-4', username: 'Voice.Of.Change', avatar: 'https://i.pravatar.cc/40?img=8', party: 'Progressive', sparklineData: [], recentChange: '+5', changeValue: 5, trend: 'up', totalPoints: 2900 },
              { id: 'eng-cp-5', userId: 'cp-5', username: 'Community.First', avatar: 'https://i.pravatar.cc/40?img=15', party: 'Green', sparklineData: [], recentChange: '-3', changeValue: -3, trend: 'down', totalPoints: 2600 },
            ],
          },
          'Best Party': {
            raceId: 'race-bestparty',
            raceName: 'Best Party',
            entries: [
              { id: 'eng-bp-1', partyId: 'bp-1', isParty: true, username: 'Unity Party', avatar: 'https://i.pravatar.cc/40?img=20', party: 'Unity Party', sparklineData: [], recentChange: '+15', changeValue: 15, trend: 'up', totalPoints: 5100 },
              { id: 'eng-bp-2', partyId: 'bp-2', isParty: true, username: 'Freedom Party', avatar: 'https://i.pravatar.cc/40?img=22', party: 'Freedom Party', sparklineData: [], recentChange: '-4', changeValue: -4, trend: 'down', totalPoints: 4500 },
              { id: 'eng-bp-3', partyId: 'bp-3', isParty: true, username: 'Green Alliance', avatar: 'https://i.pravatar.cc/40?img=25', party: 'Green Alliance', sparklineData: [], recentChange: '+10', changeValue: 10, trend: 'up', totalPoints: 3700 },
              { id: 'eng-bp-4', partyId: 'bp-4', isParty: true, username: 'Liberty League', avatar: 'https://i.pravatar.cc/40?img=30', party: 'Liberty League', sparklineData: [], recentChange: null, changeValue: 0, trend: 'stable', totalPoints: 3200 },
              { id: 'eng-bp-5', partyId: 'bp-5', isParty: true, username: 'Progress Now', avatar: 'https://i.pravatar.cc/40?img=33', party: 'Progress Now', sparklineData: [], recentChange: '+7', changeValue: 7, trend: 'up', totalPoints: 2800 },
            ],
          },
          'Mayor Race': {
            raceId: 'race-mayor',
            raceName: 'Mayor Race',
            entries: [
              { id: 'eng-mr-1', userId: 'mr-1', username: 'Mayor.Hopeful', avatar: 'https://i.pravatar.cc/40?img=40', party: 'Democrat', sparklineData: [], recentChange: '+20', changeValue: 20, trend: 'up', totalPoints: 6200 },
              { id: 'eng-mr-2', userId: 'mr-2', username: 'City.Builder', avatar: 'https://i.pravatar.cc/40?img=42', party: 'Republican', sparklineData: [], recentChange: '+6', changeValue: 6, trend: 'up', totalPoints: 5800 },
              { id: 'eng-mr-3', userId: 'mr-3', username: 'Downtown.Voice', avatar: 'https://i.pravatar.cc/40?img=45', party: 'Independent', sparklineData: [], recentChange: '-2', changeValue: -2, trend: 'down', totalPoints: 4100 },
              { id: 'eng-mr-4', userId: 'mr-4', username: 'For.The.People', avatar: 'https://i.pravatar.cc/40?img=48', party: 'Green', sparklineData: [], recentChange: null, changeValue: 0, trend: 'stable', totalPoints: 3500 },
            ],
          },
        }
        setAllRaceScoreboards(fallbackPool)
        setTopEngagedCandidates(fallbackPool['CoolPeople'].entries.slice(0, 3))
      }
    }
    fetchAllScoreboards()
  }, [isAuthenticated])

  // Memoized engagement context for per-reel relevance scoring
  const engagementContext = useMemo(() => ({
    allScoreboards: allRaceScoreboards,
    userContext: {
      followedRaces: userRacesFollowing,
      competingRaces: userRacesCompeting,
      party: userParty?.name || 'Independent',
      activity: userActivity,
      userId: authUser?.id,
      username: authUser?.username,
    },
  }), [allRaceScoreboards, userRacesFollowing, userRacesCompeting, userParty, userActivity, authUser])

  // Reusable function to load user profile data
  const loadUserProfile = async () => {
    if (!authUser?.id) return

    try {
      const userData = await usersApi.getUser(authUser.id)
      // Backend returns {success: true, data: {user: {...}}}
      const profile = userData.data?.user || userData.user || userData.data || userData

      // Update local state with persisted data from backend
      // Use !== undefined to allow empty strings
      if (profile.bio !== undefined) setUserBio(profile.bio || '')
      if (profile.avatarUrl !== undefined) setCustomAvatar(profile.avatarUrl || null)
      if (profile.followersCount !== undefined) setUserFollowers(profile.followersCount?.toString() || '0')
      if (profile.followingCount !== undefined) setUserFollowing(profile.followingCount?.toString() || '0')
      if (profile.racesFollowing) setUserRacesFollowing(profile.racesFollowing)
      if (profile.racesCompeting) setUserRacesCompeting(profile.racesCompeting)
      if (profile.points) setUserPoints(profile.points)
      setHasOptedIn(profile.userType === 'CANDIDATE')

      // Load user's party if they have one (from new partyId relation)
      console.log('Profile party data:', profile.party)

      // Check party permissions from memberships (available in both paths)
      if (profile.parties && profile.parties.length > 0) {
        const primaryPartyInfo = profile.parties[0]
        const permissions = primaryPartyInfo.permissions || []
        setCanEnterPartyInRaces(permissions.includes('leader') || permissions.includes('admin'))
      }

      if (profile.party && profile.party.id) {
        console.log('Loading full party details for:', profile.party.id)
        try {
          const partyResponse = await partiesApi.getParty(profile.party.id)
          const partyData = partyResponse.data?.party || partyResponse.party || partyResponse.data || partyResponse
          if (partyData) {
            const newUserParty = {
              id: partyData.id,
              name: partyData.name,
              handle: partyData.handle,
              bio: partyData.bio || partyData.description,
              color: partyData.color || '#FF2A55',
              photo: partyData.avatarUrl || partyData.avatar,
              type: partyData.type || 'open',
              privacy: partyData.privacy || 'public',
              stats: partyData.stats,
            }
            console.log('Setting userParty to:', newUserParty)
            setUserParty(newUserParty)
          }
        } catch (partyError) {
          console.log('Could not load full party details:', partyError.message)
          // At minimum, set the party info so profile shows it
          setUserParty({ id: profile.party.id, name: profile.party.name })
        }
      } else if (profile.parties && profile.parties.length > 0) {
        // Fallback: old memberships-based approach
        const primaryPartyInfo = profile.parties[0]
        setUserParty({ id: primaryPartyInfo.id, name: primaryPartyInfo.name, handle: primaryPartyInfo.handle })
      }
    } catch (error) {
      console.log('Using local state for profile:', error.message)
    }
  }

  // Reusable function to load user's posts
  const loadUserPosts = async () => {
    if (!authUser?.id) return

    try {
      const response = await reelsApi.getUserReels(authUser.id)
      const posts = response.data || response
      if (posts) {
        // Filter out party-only posts (those with partyId belong to the party profile, not the user profile)
        const filtered = posts.filter(p => !p.partyId)
        setUserPosts(filtered)
      }
    } catch (error) {
      console.log('Using local posts:', error.message)
    }
  }

  // Reusable function to load user's reposts from backend
  const loadUserReposts = async () => {
    if (!authUser?.id) return

    try {
      const response = await reelsApi.getUserReposts(authUser.id)
      const reposts = response.data || response
      if (reposts && Array.isArray(reposts)) {
        // Merge: use API data as authoritative, but keep any optimistic
        // entries whose originalReelId isn't in the API response yet
        // (backend may not have processed them)
        setUserReposts(prev => {
          const apiOrigIds = new Set(reposts.map(r => r.originalReelId || r.id))
          const pending = prev.filter(r =>
            r.originalReelId && !apiOrigIds.has(r.originalReelId)
          )
          return [...pending, ...reposts]
        })
      }
    } catch (error) {
      console.log('Using local reposts:', error.message)
    }
  }

  // Reusable function to load user's activity from backend
  const loadUserActivity = async () => {
    if (!authUser?.id) return

    try {
      const response = await reelsApi.getUserActivity(authUser.id)
      const activities = response.data || response
      if (activities && Array.isArray(activities)) {
        setUserActivity(activities)
      }
    } catch (error) {
      console.log('Using local activity:', error.message)
    }
  }

  // Load user profile data from backend when authenticated
  useEffect(() => {
    loadUserProfile()
  }, [authUser?.id])

  // Update userParty when authUser.partyId changes (party join/leave)
  useEffect(() => {
    const updatePartyFromAuth = async () => {
      if (!authUser) return

      // If user has no partyId, they're Independent
      if (!authUser.partyId) {
        console.log('User has no partyId, setting userParty to null (Independent)')
        setUserParty(null)
        return
      }

      // If partyId changed, fetch the new party data
      if (userParty?.id !== authUser.partyId) {
        console.log('Party changed, fetching new party data for:', authUser.partyId)
        try {
          const response = await partiesApi.getParty(authUser.partyId)
          const partyData = response?.data?.party || response?.party || response?.data
          if (partyData) {
            const newUserParty = {
              id: partyData.id,
              name: partyData.name,
              handle: partyData.handle,
              bio: partyData.bio || partyData.description,
              color: partyData.color || '#FF2A55',
              photo: partyData.avatarUrl || partyData.photo,
              type: partyData.isPrivate ? 'private' : 'public',
              privacy: partyData.isPrivate ? 'private' : 'public',
              stats: partyData.stats,
            }
            console.log('Updated userParty to:', newUserParty)
            setUserParty(newUserParty)
          }
        } catch (error) {
          console.error('Failed to fetch party data:', error)
        }
      }
    }

    updatePartyFromAuth()
  }, [authUser?.partyId])

  // Track previous party ID to detect actual changes (not initial load)
  const prevPartyIdRef = useRef(undefined)

  // When userParty changes, update the party info in reels and posts for the current user
  // This ensures that after changing party in settings, all UI shows the updated party
  useEffect(() => {
    if (!authUser?.id) return

    const currentPartyId = userParty?.id || null

    // Only update if party actually changed (skip initial mount)
    if (prevPartyIdRef.current === undefined) {
      prevPartyIdRef.current = currentPartyId
      return
    }

    // If party didn't change, skip update
    if (prevPartyIdRef.current === currentPartyId) {
      return
    }

    console.log('Party changed from', prevPartyIdRef.current, 'to', currentPartyId)
    prevPartyIdRef.current = currentPartyId

    const newPartyName = userParty?.name || null

    // Update reels state - change party for current user's reels
    setReels(prev => prev.map(reel => {
      const reelUserId = reel.user?.id || reel.userId
      if (reelUserId === authUser.id) {
        return {
          ...reel,
          user: {
            ...reel.user,
            party: newPartyName,
            partyId: currentPartyId,
          }
        }
      }
      return reel
    }))

    // Update userPosts state
    setUserPosts(prev => prev.map(post => ({
      ...post,
      user: {
        ...post.user,
        party: newPartyName,
        partyId: currentPartyId,
      }
    })))

    // Trigger scoreboard refresh so it fetches fresh data
    setScoreboardRefreshKey(prev => prev + 1)

    console.log('Updated reels and posts with new party:', newPartyName)
  }, [userParty?.id, userParty?.name, authUser?.id])

  // Load user's posts, reposts, and activity from backend on initial auth
  useEffect(() => {
    loadUserPosts()
    loadUserReposts()
    loadUserActivity()
  }, [authUser?.id])

  // Refresh profile data when navigating to MyProfile page
  useEffect(() => {
    if (currentPage === 5 && authUser?.id) {
      loadUserPosts()
      loadUserReposts()
      loadUserActivity()
      loadUserProfile()
    }
  }, [currentPage])

  // Initialize socket for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return

    // Initialize socket connection
    initializeSocket()

    // Listen for follow updates to update follower count in real-time
    const cleanupFollowListener = onFollowUpdate((data) => {
      if (data.isFollowing) {
        // Someone followed the current user - increase follower count
        setUserFollowers(prev => (parseInt(prev) + 1).toString())
      } else {
        // Someone unfollowed the current user - decrease follower count
        setUserFollowers(prev => Math.max(0, parseInt(prev) - 1).toString())
      }
    })

    return () => {
      cleanupFollowListener()
      disconnectSocket()
    }
  }, [isAuthenticated])

  console.log('AppContent render - isAuthenticated:', isAuthenticated, 'user:', authUser)

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="auth-loading-logo">CoolPeople</div>
          <div className="auth-loading-spinner"></div>
        </div>
      </div>
    )
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />
    }
    return <Login onSwitchToRegister={() => setAuthView('register')} />
  }

  // Function to track user activity (likes, comments, nominations, etc.)
  const trackActivity = (type, video) => {
    // Special handling: "Use Audio" opens CreateScreen with sound pre-selected
    if (type === 'useAudio' && video?.sound) {
      setCreateScreenSound(video.sound)
      setShowCreateScreen(true)
      return
    }

    const activity = {
      id: `act-${Date.now()}`,
      type,
      action: type === 'like' ? 'liked' : type === 'comment' ? 'commented' : type === 'nominate' ? 'nominated' : type === 'repost' ? 'reposted' : type === 'endorse' ? 'endorsed' : type === 'ballot' ? 'added to ballot' : type === 'favorite' ? 'favorited' : type,
      timestamp: new Date().toISOString(),
      actor: {
        username: authUser?.username || 'User',
        displayName: authUser?.displayName || authUser?.username || 'User',
        avatar: authUser?.avatarUrl || authUser?.avatar || null,
      },
      reel: video, // Full reel object for SinglePostView (comments, engagement)
      video: {
        thumbnail: video.thumbnail || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
        videoUrl: video.videoUrl || null,
        isMirrored: video.isMirrored || false,
        user: video.user || { username: 'unknown', avatar: 'https://i.pravatar.cc/40?img=1', party: null },
        race: video.targetRace || null,
        likes: video.stats?.likes || '0',
        comments: video.stats?.comments || '0',
        shares: video.stats?.shares || '0',
        caption: video.caption || video.title || '',
      },
    }
    setUserActivity(prev => [activity, ...prev])
  }

  // Handle when user reposts a reel - add to profile reposts only (not feed)
  const handleRepostChange = (reelId, isReposted, reel) => {
    if (isReposted && reel) {
      const originalReel = reel.originalReelId ? { ...reel, repostedBy: undefined } : reel
      const originalId = reel.originalReelId || reelId

      const repostEntry = {
        ...originalReel,
        id: `repost-${originalId}-${Date.now()}`,
        originalReelId: originalId,
        repostedBy: {
          id: authUser?.id,
          username: authUser?.username || authUser?.handle,
          displayName: authUser?.displayName || authUser?.username,
          avatarUrl: authUser?.avatarUrl || authUser?.avatar,
        },
        repostedAt: new Date().toISOString(),
      }

      // Only add to user's reposts (profile tags tab), not the main feed
      setUserReposts(prev => [repostEntry, ...prev])
    } else if (!isReposted) {
      // Remove from user's reposts on unrepost
      const originalId = reel?.originalReelId || reelId
      setUserReposts(prev => prev.filter(r => {
        const rOrigId = r.originalReelId || r.id
        return rOrigId !== originalId
      }))
    }
  }

  // Current user info from auth context
  // isParticipant = true means they can't be nominated as a candidate in races
  const currentUser = {
    id: authUser?.id || 'current-user',
    username: authUser?.username || 'User',
    displayName: authUser?.displayName || 'User',
    party: userParty?.name || 'Independent',
    avatar: customAvatar || authUser?.avatarUrl || null, // null shows placeholder in MyProfile
    isParticipant: authUser?.userType === 'PARTICIPANT', // PARTICIPANT can't be nominated, CANDIDATE can
    bio: userBio,
    following: userFollowing,
    followers: userFollowers,
    racesFollowing: userRacesFollowing,
    racesCompeting: userRacesCompeting,
    points: userPoints,
  }

  // Handle party creation from groupchat - converts groupchat to party chat
  const handlePartyCreatedFromGroupchat = async (partyData, groupChatId, memberIds) => {
    try {
      // 1. Create the party in backend, passing groupChatId to convert existing chat
      const createPayload = {
        name: partyData.name,
        handle: partyData.handle,
        description: partyData.bio || '',
        isPrivate: partyData.privacy === 'private',
        chatMode: partyData.type === 'closed' ? 'ADMIN_ONLY' : 'OPEN',
        groupChatId: groupChatId, // Convert existing groupchat to party chat
      }
      if (partyData.photo && typeof partyData.photo === 'string') {
        createPayload.avatarUrl = partyData.photo
      }
      console.log('Creating party from groupchat:', createPayload)
      const response = await partiesApi.createParty(createPayload)
      const createdParty = response.data?.party || response.party || response.data || response

      // 2. Update creator's party affiliation locally
      const fullPartyData = {
        id: createdParty.id,
        name: partyData.name,
        handle: partyData.handle,
        bio: partyData.bio,
        photo: partyData.photo,
        color: partyData.color,
        type: partyData.type,
        privacy: partyData.privacy,
        stats: partyData.stats,
        isNewParty: true,
      }
      setUserParty(fullPartyData)

      // Refresh auth user to get updated partyId from backend
      await refreshUser()
      console.log('Party affiliation updated for creator')

      // 3. Send invite message to the groupchat (now party chat)
      // This message serves as the invite for all members to join
      await groupchatsApi.sendMessage(
        groupChatId,
        `This group is now ${partyData.name}! Accept the invite to continue seeing messages.`,
        {
          type: 'party_invite',
          partyId: createdParty.id,
          partyHandle: partyData.handle,
          partyName: partyData.name,
          partyColor: partyData.color,
          partyAvatar: partyData.photo,
          fromGroupChat: true,
        }
      )
      console.log('Sent party conversion message to groupchat')

      // 4. Refresh conversations to show updated chat name
      refreshConversations()

      return { success: true, party: createdParty }
    } catch (error) {
      console.error('Failed to create party from groupchat:', error)
      return { success: false, error }
    }
  }

  // Handle avatar change from MyProfile - saves to backend
  const handleAvatarChange = async (avatarUrl) => {
    setCustomAvatar(avatarUrl)
    // Save to backend
    if (authUser?.id) {
      try {
        await usersApi.updateUser(authUser.id, { avatarUrl })
      } catch (error) {
        console.error('Failed to save avatar:', error)
      }
    }
  }

  // Handle bio change from MyProfile - saves to backend
  const handleBioChange = async (bio) => {
    setUserBio(bio)
    // Save to backend
    if (authUser?.id) {
      try {
        await usersApi.updateUser(authUser.id, { bio })
      } catch (error) {
        console.error('Failed to save bio:', error)
      }
    }
  }

  // Handle new post creation
  // forParty param allows passing party data directly when userParty state hasn't updated yet
  const handlePostCreated = async (postData, forParty = null) => {
    console.log('handlePostCreated called with:', postData)
    const timestamp = Date.now()
    const effectiveParty = forParty || userParty
    let savedReelId = null // Track the backend reel ID for sharing

    // All posts (including nominations) go to the reel feed
    {
      // Generate engagement scores for the sparklines at top
      const defaultEngagementScores = [
        {
          id: `eng-${timestamp}-1`,
          username: currentUser.username,
          avatar: currentUser.avatar,
          party: currentUser.party,
          sparklineData: [],
          recentChange: null,
          trend: 'up',
        },
        {
          id: `eng-${timestamp}-2`,
          username: 'Lzo.macias.formayor',
          avatar: 'https://i.pravatar.cc/40?img=1',
          party: 'Democrat',
          sparklineData: [],
          recentChange: '+1',
          trend: 'up',
        },
        {
          id: `eng-${timestamp}-3`,
          username: 'Sarah.J.Council',
          avatar: 'https://i.pravatar.cc/40?img=5',
          party: 'Republican',
          sparklineData: [],
          recentChange: null,
          trend: 'stable',
        },
      ]

      // postTo is now an array for multi-select
      const postToArray = Array.isArray(postData.postTo) ? postData.postTo : [postData.postTo || 'Your Feed']
      const isPostingToFeed = postToArray.includes('Your Feed')
      const isPostingToPartyFeed = effectiveParty && postToArray.some(target => target !== 'Your Feed' && (target.includes(effectiveParty.name) || target.includes('Party')))
      const isPartyOnlyPost = isPostingToPartyFeed && !isPostingToFeed

      // Party avatar for party-only posts
      const partyAvatar = effectiveParty?.photo || effectiveParty?.avatarUrl || (effectiveParty?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveParty.name)}&background=${effectiveParty.color?.replace('#', '') || 'e91e8c'}&color=fff&size=150` : null)

      const newReel = {
        id: `reel-${timestamp}`,
        videoUrl: postData.videoUrl || null,
        thumbnail: postData.videoUrl || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop',
        user: isPartyOnlyPost ? {
          // Party post: use party identity
          id: effectiveParty.id,
          username: effectiveParty.handle || effectiveParty.name,
          displayName: effectiveParty.name,
          party: effectiveParty.name,
          avatar: partyAvatar,
        } : {
          ...currentUser,
          party: effectiveParty?.name || currentUser.party,
        },
        title: postData.title || '',
        caption: postData.caption || '',
        engagementScores: defaultEngagementScores,
        stats: { votes: '0', likes: '1', comments: '0', shazam: '0', shares: '0' },
        isLiked: true, // Creator auto-likes their own post
        targetRace: postData.targetRace || null,
        createdAt: new Date().toISOString(),
        isMirrored: postData.isMirrored || false,
        textOverlays: postData.textOverlays || [],
        selfieSize: postData.selfieSize || null,
        selfiePosition: postData.selfiePosition || null,
        showSelfieOverlay: postData.showSelfieOverlay ?? false,
        taggedUser: postData.taggedUser || null,
        isNomination: postData.isNomination || false,
        soundName: postData.soundName || null,
        isPartyPost: isPartyOnlyPost, // Flag for ReelCard to render party-style (only when party-only)
        partyId: isPostingToPartyFeed ? effectiveParty.id : null, // Set for any party post (including both feeds)
        metadata: {
          textOverlays: postData.textOverlays || [],
          selfieSize: postData.selfieSize || null,
          selfiePosition: postData.selfiePosition || null,
          showSelfieOverlay: postData.showSelfieOverlay ?? false,
          selfieVideoUrl: postData.selfieVideoUrl || null,
          selfieIsMirrored: postData.selfieIsMirrored ?? false,
          taggedUser: postData.taggedUser || null,
          isNomination: postData.isNomination || false,
          trimStart: postData.trimStart ?? 0,
          trimEnd: postData.trimEnd ?? null,
          soundOffset: postData.soundOffset ?? 0,
          videoVolume: postData.videoVolume ?? 100,
          soundVolume: postData.soundVolume ?? 100,
          segments: postData.segments || null,
          soundUrl: postData.soundUrl || null,
          soundName: postData.soundName || null,
          quotedReelId: postData.quotedReelId || null,
          quotedReelVideoUrl: postData.quotedReelVideoUrl || null,
          quotedReelUser: postData.quotedReelUser || null,
        },
      }

      // Add to main feed (party-only posts still appear in the algorithm feed)
      console.log('Adding new reel to feed:', newReel)
      setReels(prev => [newReel, ...prev])

      // Add to party posts if posting to party
      if (isPostingToPartyFeed) {
        console.log('Adding to party posts:', newReel)
        setPartyPosts(prev => [newReel, ...prev])
      }

      // Only add to user's posts if posting to their own feed (not party-only)
      if (!isPartyOnlyPost) {
        console.log('Adding to user posts:', newReel)
        setUserPosts(prev => [newReel, ...prev])
      }

      // Save to backend
      try {
        let raceId = null

        // Create new race if needed
        if (postData.isCreatingNewRace && postData.targetRace) {
          console.log('Creating new race:', postData.targetRace)
          try {
            // Convert deadline to full ISO 8601 format if provided (frontend stores as YYYY-MM-DDTHH:MM)
            let endDateISO = null
            if (postData.raceDeadline) {
              const deadlineDate = new Date(postData.raceDeadline)
              if (!isNaN(deadlineDate.getTime())) {
                endDateISO = deadlineDate.toISOString()
              }
            }
            const raceData = {
              title: postData.targetRace,
              raceType: postData.raceType === 'party' ? 'PARTY_VS_PARTY' : 'CANDIDATE_VS_CANDIDATE',
              winCondition: postData.winMethod === 'ballot' ? 'BALLOT' : 'POINTS',
              endDate: endDateISO,
            }
            const raceResult = await racesApi.createRace(raceData)
            // Response structure is { data: { race: { id, ... } } }
            raceId = raceResult.data?.race?.id || raceResult.race?.id || raceResult.data?.id || raceResult.id

            // If user wants to compete, join the race
            if (postData.wantToCompete && raceId) {
              try {
                await racesApi.competeInRace(raceId)
                console.log('Joined race as competitor')
              } catch (competeError) {
                console.error('Failed to join race as competitor:', competeError)
              }
            }
          } catch (raceError) {
            console.error('Failed to create race:', raceError)
          }
        } else if (postData.selectedExistingRace) {
          // Using existing race
          raceId = postData.selectedExistingRace.id
          console.log('Using existing race ID:', raceId)

          // If user wants to compete in existing race, join it
          if (postData.wantToCompete && raceId) {
            try {
              await racesApi.competeInRace(raceId)
              console.log('Joined existing race as competitor')
            } catch (competeError) {
              console.error('Failed to join race as competitor:', competeError)
            }
          }
        }

        const reelData = {
          videoUrl: postData.videoUrl,
          title: postData.title || '',
          description: postData.caption || '', // Backend expects 'description' not 'caption'
          partyId: isPostingToPartyFeed ? effectiveParty.id : null, // Set for any party post (both feeds or party-only)
          isPartyPost: isPartyOnlyPost, // True = party-only (shows only in party feed), False = user post (may also show in party feed)
          duration: postData.duration || 30,
          isMirrored: postData.isMirrored || false, // Track front camera mirror state
          soundId: postData.soundId || undefined,
          metadata: {
            textOverlays: postData.textOverlays || [],
            selfieSize: postData.selfieSize || null,
            selfiePosition: postData.selfiePosition || null,
            showSelfieOverlay: postData.showSelfieOverlay ?? false,
            selfieVideoUrl: postData.selfieVideoUrl || null,
            selfieIsMirrored: postData.selfieIsMirrored ?? false,
            taggedUser: postData.taggedUser || null,
            isNomination: postData.isNomination || false,
            trimStart: postData.trimStart ?? 0,
            trimEnd: postData.trimEnd ?? null,
            soundOffset: postData.soundOffset ?? 0,
            soundStartFrac: postData.soundStartFrac ?? 0,
            soundEndFrac: postData.soundEndFrac ?? 1,
            videoVolume: postData.videoVolume ?? 100,
            soundVolume: postData.soundVolume ?? 100,
            segments: postData.segments || null,
            soundUrl: postData.soundUrl || null,
            soundName: postData.soundName || null,
            quotedReelId: postData.quotedReelId || null,
            quotedReelVideoUrl: postData.quotedReelVideoUrl || null,
            quotedReelUser: postData.quotedReelUser || null,
          },
        }
        // Add raceIds if we have a race (new or existing)
        if (raceId) {
          reelData.raceIds = [raceId]
        } else if (postData.targetRace) {
          // Fallback: If it's a UUID, wrap in array; otherwise skip
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidPattern.test(postData.targetRace)) {
            reelData.raceIds = [postData.targetRace]
          }
        }
        console.log('Saving reel to backend:', reelData)
        const result = await reelsApi.createReel(reelData)
        console.log('Reel saved successfully:', result)

        // Update local reel ID with the real UUID from backend
        const backendReelId = result.data?.reel?.id || result.reel?.id || result.data?.id
        if (backendReelId) {
          savedReelId = backendReelId
          const tempId = newReel.id
          // Update in reels feed
          setReels(prev => prev.map(r => r.id === tempId ? { ...r, id: backendReelId } : r))
          // Update in user posts
          setUserPosts(prev => prev.map(r => r.id === tempId ? { ...r, id: backendReelId } : r))
          // Update in party posts
          setPartyPosts(prev => prev.map(r => r.id === tempId ? { ...r, id: backendReelId } : r))
          console.log('Updated local reel ID from', tempId, 'to', backendReelId)
        }
      } catch (error) {
        console.error('Failed to save post to backend:', error)
      }
    }

    // Handle sending to chats (legacy tag-based)
    if (postData.sendTo && postData.sendTo.length > 0) {
      const mediaMessage = {
        id: `msg-${timestamp}`,
        text: postData.caption || null,
        mediaUrl: postData.videoUrl,
        mediaType: 'video',
        isMirrored: postData.isMirrored || false,
        isOwn: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      // Find conversation IDs that match sendTo names and add message
      setConversations(prev => {
        const updated = { ...prev }
        postData.sendTo.forEach(chatName => {
          // Find the conversation ID by matching username
          const matchingMsg = mockMessages.find(m =>
            m.user.username === chatName ||
            m.user.username.includes(chatName.split(' ')[0])
          )
          if (matchingMsg) {
            const convId = matchingMsg.id
            updated[convId] = [...(updated[convId] || []), mediaMessage]
          }
        })
        return updated
      })
    }

    // Handle sending to users/chats from the picker modal
    if (postData.sendToUsers && postData.sendToUsers.length > 0) {
      if (!savedReelId) {
        console.warn('⚠️ No savedReelId available - reel sharing messages will not support like/comment actions')
      }
      const reelMessage = {
        type: 'reel',
        videoUrl: postData.videoUrl,
        caption: postData.caption || '',
        title: postData.title || '',
        targetRace: postData.targetRace || null,
        reelId: savedReelId || null,
        isMirrored: postData.isMirrored || false,
        thumbnail: postData.videoUrl,
        user: currentUser,
        selfieVideoUrl: postData.selfieVideoUrl || null,
        selfieIsMirrored: postData.selfieIsMirrored ?? false,
        selfieSize: postData.selfieSize || null,
        selfiePosition: postData.selfiePosition || null,
        showSelfieOverlay: postData.showSelfieOverlay ?? false,
        quotedReelId: postData.quotedReelId || null,
        quotedReelUser: postData.quotedReelUser || null,
      }

      // Send to each recipient
      for (const recipient of postData.sendToUsers) {
        try {
          if (recipient.isChat) {
            // It's a chat (party, group, or DM conversation)
            if (recipient.type === 'party') {
              // Send to party chat - use party chat API
              const partyId = recipient.id.replace('party-', '')
              // Party messages go through party chat
              console.log('Sending reel to party chat:', recipient.name)
              // For now, add to local state - party chat sending would need party chat API
            } else if (recipient.type === 'group') {
              // Send to group chat
              await groupchatsApi.sendMessage(recipient.id, postData.caption || 'Shared a reel', {
                type: 'reel',
                ...reelMessage
              })
              console.log('Sent reel to group chat:', recipient.name)
            } else {
              // DM conversation - send as message
              await messagesApi.sendMessage({
                receiverId: recipient.id,
                content: postData.caption || 'Shared a reel',
                metadata: {
                  type: 'reel',
                  ...reelMessage
                }
              })
              console.log('Sent reel to DM:', recipient.name)
            }
          } else {
            // It's a user - send as DM
            await messagesApi.sendMessage({
              receiverId: recipient.id,
              content: postData.caption || 'Shared a reel',
              metadata: {
                type: 'reel',
                ...reelMessage
              }
            })
            console.log('Sent reel to user:', recipient.username || recipient.name)
          }

          // Update local conversations to show the sent message
          const convId = recipient.isChat ? recipient.id : recipient.id
          const localMessage = {
            id: `msg-${timestamp}-${recipient.id}`,
            content: postData.caption || 'Shared a reel',
            text: postData.caption || null,
            mediaUrl: postData.videoUrl, // Top-level for video bubble rendering
            mediaType: 'video',
            isMirrored: postData.isMirrored || false,
            isOwn: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString(),
            metadata: {
              type: 'reel',
              ...reelMessage
            }
          }

          setConversations(prev => ({
            ...prev,
            [convId]: {
              ...(prev[convId] || {}),
              id: convId,
              recipientId: recipient.id,
              participantId: recipient.id,
              participantName: recipient.name || recipient.username,
              participantUsername: recipient.username,
              participantAvatar: recipient.avatar,
              messages: [...(prev[convId]?.messages || []), localMessage],
              lastMessage: postData.caption || 'Sent a video',
              lastMessageAt: new Date().toISOString(),
            }
          }))
        } catch (error) {
          console.error('Failed to send reel to', recipient.name || recipient.username, error)
        }
      }

      // If sendTogether is true, we could create a group message
      if (postData.sendTogether && postData.sendToUsers.length > 1) {
        console.log('Sent as group message to:', postData.sendToUsers.map(u => u.name || u.username))
      }
    }

    // Close create screen and navigate to feed
    setShowCreateScreen(false)
    setCurrentPage(1) // Go to home/reels page

    // Scroll feed to top after a short delay to ensure new post is rendered
    setTimeout(() => {
      if (reelsFeedRef.current) {
        reelsFeedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  // Save current overlay state to history
  const saveToHistory = () => {
    const currentState = {
      showComments,
      activeReel,
      showProfile,
      activeCandidate,
      showPartyProfile,
      activeParty,
      showParticipantProfile,
      activeParticipant,
      isOwnParticipantProfile,
    }
    // Only save if something is open
    if (showComments || showProfile || showPartyProfile || showParticipantProfile) {
      setNavHistory(prev => [...prev, currentState])
    }
  }

  // Go back to previous state
  const handleBack = () => {
    if (navHistory.length === 0) {
      // Nothing in history, just close everything
      setShowComments(false)
      setShowProfile(false)
      setShowPartyProfile(false)
      setShowParticipantProfile(false)
      return
    }

    const prevState = navHistory[navHistory.length - 1]
    setNavHistory(prev => prev.slice(0, -1))

    // Restore previous state
    setShowComments(prevState.showComments)
    setActiveReel(prevState.activeReel)
    setShowProfile(prevState.showProfile)
    setActiveCandidate(prevState.activeCandidate)
    setShowPartyProfile(prevState.showPartyProfile)
    setActiveParty(prevState.activeParty)
    setShowParticipantProfile(prevState.showParticipantProfile)
    setActiveParticipant(prevState.activeParticipant)
    setIsOwnParticipantProfile(prevState.isOwnParticipantProfile)
  }

  // Swipe handling
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentPage < PAGES.length - 1) {
        // Swipe left -> go right
        setCurrentPage(currentPage + 1)
      } else if (diff < 0 && currentPage > 0) {
        // Swipe right -> go left
        setCurrentPage(currentPage - 1)
      }
    }
  }

  const handleOpenComments = (reel) => {
    setActiveReel(reel)
    setShowComments(true)
  }

  const handleCloseComments = () => {
    setShowComments(false)
    setActiveReel(null)
  }

  const handleOpenProfile = (candidate) => {
    console.log('=== handleOpenProfile called ===')
    console.log('candidate received:', candidate)
    console.log('currentUser:', currentUser)
    console.log('authUser:', authUser)

    // Check if this is the current user (check both id and userId since scoreboard uses userId)
    const candidateId = candidate.id || candidate.userId
    console.log('candidateId:', candidateId, 'currentUser.id:', currentUser.id)

    const isCurrentUser = candidate.username === currentUser.username ||
                          candidateId === currentUser.id ||
                          candidateId === authUser?.id

    console.log('isCurrentUser:', isCurrentUser)

    // If clicking on own profile, navigate to MyProfile page
    if (isCurrentUser) {
      console.log('Redirecting to MyProfile (page 5) - this is own profile')
      setShowComments(false)
      setShowProfile(false)
      setShowPartyProfile(false)
      setShowParticipantProfile(false)
      setCurrentPage(5) // Profile page
      return
    }

    console.log('Opening other user profile overlay')
    saveToHistory()
    setShowComments(false)
    setShowPartyProfile(false)

    // Check if we know the user's type from the passed object or from cache
    const cached = getCachedUserProfile(candidateId || candidate.username)
    const knownUserType = candidate.userType || cached?.userType

    if (knownUserType === 'PARTICIPANT') {
      // Route directly to ParticipantProfile
      console.log('User is PARTICIPANT - opening ParticipantProfile')
      setShowProfile(false)
      setActiveCandidate(null)
      setActiveParticipant({
        ...candidate,
        ...(cached || {}),
        id: candidateId,
        userId: candidateId,
      })
      setShowParticipantProfile(true)
    } else {
      // Default to CandidateProfile (will redirect to Participant if API returns PARTICIPANT)
      setShowParticipantProfile(false)
      setActiveCandidate(candidate)
      setShowProfile(true)
    }
    // Scroll to top after state update
    setTimeout(() => {
      if (profileOverlayRef.current) {
        profileOverlayRef.current.scrollTo(0, 0)
      }
    }, 0)
  }

  const handleCloseProfile = () => {
    setShowProfile(false)
    setActiveCandidate(null)
  }

  // Helper to check if a string is a UUID
  const isUUID = (str) => {
    if (typeof str !== 'string') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const handleOpenPartyProfile = (partyIdentifier) => {
    // partyIdentifier can be: party name (string), party ID (UUID string), or object with {id, name}
    const partyId = typeof partyIdentifier === 'object' ? partyIdentifier.id : (isUUID(partyIdentifier) ? partyIdentifier : null)
    const partyName = typeof partyIdentifier === 'object' ? (partyIdentifier.name || partyIdentifier.partyName) : partyIdentifier
    const cacheKey = partyId || partyName

    // First check if it's the user's created party
    if (userParty && (partyName === userParty.name || partyName === userParty.handle || partyId === userParty.id)) {
      // Pass minimal party data - let PartyProfile fetch real stats from API
      // IMPORTANT: Must include id so PartyProfile can fetch from API
      const userPartyProfile = {
        id: userParty.id, // Critical for API fetch
        name: userParty.name,
        handle: userParty.handle,
        color: userParty.color,
        type: userParty.type,
        avatar: userParty.photo || userParty.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userParty.name)}&background=${userParty.color?.replace('#', '') || 'e91e8c'}&color=fff&size=150`,
        bio: userParty.bio || userParty.description,
        posts: partyPosts,
        isUserParty: true,
        isNewParty: userParty.isNewParty !== false,
      }
      saveToHistory()
      setShowComments(false)
      setShowProfile(false)
      setShowParticipantProfile(false)
      setActiveParty(userPartyProfile)
      setShowPartyProfile(true)
      return
    }

    // Check cached party profiles first (by ID or name)
    const cachedParty = partyProfiles[cacheKey] || (partyId && partyProfiles[partyId]) || partyProfiles[partyName]
    if (cachedParty) {
      saveToHistory()
      setShowComments(false)
      setShowProfile(false)
      setShowParticipantProfile(false)
      setActiveParty(cachedParty)
      setShowPartyProfile(true)
      return
    }

    // Try to fetch from API
    const fetchPartyProfile = async () => {
      try {
        let response
        // If we have a UUID, fetch by ID; otherwise fetch by handle/name
        if (partyId) {
          response = await partiesApi.getParty(partyId)
        } else {
          // Try to fetch by handle or name (backend searches both)
          response = await partiesApi.getPartyByHandle(partyName)
        }
        // Backend returns { success: true, data: { party: {...} } }
        const partyData = response?.data?.party || response?.party
        if (partyData) {
          // Cache the party profile by both ID and name
          setPartyProfiles(prev => ({
            ...prev,
            [partyData.id]: partyData,
            [partyData.name]: partyData,
            [partyData.handle]: partyData,
          }))
          saveToHistory()
          setShowComments(false)
          setShowProfile(false)
          setShowParticipantProfile(false)
          setActiveParty(partyData)
          setShowPartyProfile(true)
        }
      } catch (error) {
        console.error('Party fetch error:', error.message)
        // Don't fall back to mock data - it has fake stats
        // PartyProfile will show loading/error state
      }
    }
    fetchPartyProfile()
  }

  const handleClosePartyProfile = () => {
    setShowPartyProfile(false)
    setActiveParty(null)
  }

  const handleOpenParticipantProfile = (participant, isOwn = false) => {
    setActiveParticipant(participant)
    setIsOwnParticipantProfile(isOwn)
    setShowParticipantProfile(true)
  }

  const handleCloseParticipantProfile = () => {
    setShowParticipantProfile(false)
    setActiveParticipant(null)
    setIsOwnParticipantProfile(false)
  }

  // Handle switching between CandidateProfile and ParticipantProfile when userType changes
  const handleUserTypeChange = (newUserType, profileData) => {
    // Normalize party to string (API returns object {id, name})
    const normalizedParty = profileData.party?.name || (typeof profileData.party === 'string' ? profileData.party : null)

    if (newUserType === 'CANDIDATE') {
      // Switch from ParticipantProfile to CandidateProfile
      setShowParticipantProfile(false)
      setActiveParticipant(null)
      setActiveCandidate({
        ...profileData,
        id: profileData.id || profileData.userId,
        userId: profileData.userId || profileData.id,
        username: profileData.username,
        avatar: profileData.avatarUrl || profileData.avatar,
        party: normalizedParty || 'Independent',
      })
      setShowProfile(true)
      // Update cache with new data
      updateUserProfileCache(profileData.id || profileData.userId, profileData)
    } else if (newUserType === 'PARTICIPANT') {
      // Switch from CandidateProfile to ParticipantProfile
      console.log('[handleUserTypeChange] Switching to PARTICIPANT with data:', profileData)
      setShowProfile(false)
      setActiveCandidate(null)
      const participantData = {
        ...profileData,
        id: profileData.id || profileData.userId,
        userId: profileData.userId || profileData.id,
        username: profileData.username,
        avatar: profileData.avatarUrl || profileData.avatar,
        party: normalizedParty,
      }
      console.log('[handleUserTypeChange] Setting activeParticipant:', participantData)
      setActiveParticipant(participantData)
      setShowParticipantProfile(true)
      // Update cache with new data
      updateUserProfileCache(profileData.id || profileData.userId, profileData)
    }
  }

  const handleOptIn = async () => {
    // Save to backend first
    if (!authUser?.id) {
      console.error('Cannot become candidate: no user ID')
      return
    }

    try {
      await usersApi.becomeCandidate(authUser.id)

      // Only update local state after API succeeds
      setHasOptedIn(true)
      // Auto-enroll in CoolPeople race when becoming a candidate
      setUserRacesCompeting(prev => prev.includes('CP') ? prev : [...prev, 'CP'])
      handleCloseParticipantProfile()

      // Refresh user data from backend to ensure consistency
      await refreshUser()
    } catch (error) {
      console.error('Failed to become candidate:', error)
      // Don't update local state if API fails
    }
  }

  // Handle opting out from candidate back to participant
  const handleOptOut = async () => {
    if (!authUser?.id) {
      console.error('Cannot revert to participant: no user ID')
      return
    }

    try {
      await usersApi.revertToParticipant(authUser.id)

      // Only update local state after API succeeds
      setHasOptedIn(false)
      // Note: Per backend spec, points are frozen (decay still active), reviews remain permanent
      // User can now choose to go private again if they want

      // Refresh user data from backend to ensure consistency
      await refreshUser()
    } catch (error) {
      console.error('Failed to revert to participant:', error)
    }
  }

  // Handle clicking on a username in comments
  const handleCommentUsernameClick = (comment) => {
    // Check if this is the current user
    const isCurrentUser = comment.username === currentUser.username ||
                          comment.id === currentUser.id ||
                          comment.userId === authUser?.id

    // If clicking on own profile, navigate to MyProfile page
    if (isCurrentUser) {
      setShowComments(false)
      setCurrentPage(5) // Profile page
      return
    }

    saveToHistory()
    setShowComments(false)

    if (comment.profileType === 'candidate') {
      // Open CandidateProfile for users who opted into social credit
      setActiveCandidate({
        id: comment.id || comment.userId,
        username: comment.username,
        avatar: comment.avatar,
        party: comment.party || 'Independent',
      })
      setShowProfile(true)
    } else {
      // Open ParticipantProfile for users who haven't opted in
      setActiveParticipant({
        id: comment.id || comment.userId,
        username: comment.username,
        avatar: comment.avatar,
        party: comment.party,
        hasOptedIn: false,
      })
      setShowParticipantProfile(true)
    }
  }

  // Handle clicking on a party name in comments
  const handleCommentPartyClick = (partyName) => {
    handleOpenPartyProfile(partyName)
  }

  // Handle clicking on username in reels
  const handleReelUsernameClick = (user) => {
    // Check if this is the current user (check all possible ID fields and username)
    const userId = user.id || user.userId
    const currentUserId = currentUser.id || authUser?.id
    const isCurrentUser =
      (userId && currentUserId && userId === currentUserId) ||
      (user.username && currentUser.username && user.username.toLowerCase() === currentUser.username.toLowerCase())

    console.log('[handleReelUsernameClick] user:', user, 'currentUser:', currentUser.username, 'authUser:', authUser?.username, 'isCurrentUser:', isCurrentUser)

    // If clicking on own username, navigate to MyProfile page
    if (isCurrentUser) {
      setCurrentPage(5) // Profile page
      return
    }

    // Otherwise show the other user's profile overlay
    setActiveCandidate({
      id: userId,
      userId: userId,
      username: user.username,
      avatar: user.avatar || user.avatarUrl,
      party: user.party || 'Independent',
      posts: null,
      isCurrentUser: false,
    })
    setShowProfile(true)
  }

  // Handle clicking on party tag in reels
  const handleReelPartyClick = (partyName) => {
    handleOpenPartyProfile(partyName)
  }

  // Handle clicking on engagement score item in reels
  const handleEngagementClick = (score) => {
    const candidateId = score.userId || score.odId

    // Check if this is the current user
    const isCurrentUser = score.username === currentUser.username ||
                          candidateId === currentUser.id ||
                          candidateId === authUser?.id

    // If clicking on own profile, navigate to MyProfile page
    if (isCurrentUser) {
      setCurrentPage(5) // Profile page
      return
    }

    // If this is a party entry, open party profile
    if (score.isParty) {
      handleOpenPartyProfile({ id: score.partyId, name: score.username })
      return
    }

    // Engagement scores are candidates (on the scoreboard)
    setActiveCandidate({
      id: candidateId,
      username: score.username,
      avatar: score.avatar,
      party: score.party || 'The Pink Lady Party',
    })
    setShowProfile(true)
  }

  // Handle hiding posts from feed
  const handleHideReel = (reelId, hideType, userId) => {
    // Find current reel index before removing
    const currentIndex = reels.findIndex(r => r.id === reelId)

    if (hideType === 'user' && userId) {
      // Hide all posts from this user
      setReels(prev => prev.filter(reel => {
        const reelUserId = reel.user?.id || reel.userId
        return reelUserId !== userId
      }))
    } else {
      // Hide just this post
      setReels(prev => prev.filter(reel => reel.id !== reelId))
    }

    // Scroll to next reel (same position since current one is removed)
    if (reelsFeedRef.current && currentIndex >= 0) {
      setTimeout(() => {
        const reelHeight = window.innerHeight
        reelsFeedRef.current?.scrollTo({
          top: currentIndex * reelHeight,
          behavior: 'smooth'
        })
      }, 100)
    }
  }

  // Centralized user profile cache management
  const updateUserProfileCache = (userId, profileData) => {
    if (!userId) return
    setUserProfilesCache(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...profileData,
        lastUpdated: Date.now(),
      }
    }))
  }

  // Get user from cache by ID or username
  const getCachedUserProfile = (identifier) => {
    if (!identifier) return null
    // Try by ID first
    if (userProfilesCache[identifier]) {
      return userProfilesCache[identifier]
    }
    // Try by username
    const byUsername = Object.values(userProfilesCache).find(
      u => u.username === identifier
    )
    return byUsername || null
  }

  // Centralized follow action handler - updates cache and activeCandidate
  const handleFollowActionGlobal = (targetUserId, targetUsername, isNowFollowing, newFollowerCount) => {
    // Update the cache
    setUserProfilesCache(prev => {
      const key = targetUserId || targetUsername
      if (!key) return prev

      // Find existing entry by ID or username
      let existingKey = targetUserId
      if (!prev[existingKey]) {
        existingKey = Object.keys(prev).find(k => prev[k].username === targetUsername)
      }

      if (existingKey && prev[existingKey]) {
        return {
          ...prev,
          [existingKey]: {
            ...prev[existingKey],
            isFollowing: isNowFollowing,
            followersCount: newFollowerCount,
            followers: newFollowerCount?.toString(),
            lastUpdated: Date.now(),
          }
        }
      }
      return prev
    })

    // Update activeCandidate if it's the same user
    if (activeCandidate && (activeCandidate.id === targetUserId || activeCandidate.userId === targetUserId || activeCandidate.username === targetUsername)) {
      setActiveCandidate(prev => ({
        ...prev,
        isFollowing: isNowFollowing,
        followersCount: newFollowerCount,
        followers: newFollowerCount?.toString(),
      }))
    }

    // Update activeParticipant if it's the same user
    if (activeParticipant && (activeParticipant.id === targetUserId || activeParticipant.userId === targetUserId || activeParticipant.username === targetUsername)) {
      setActiveParticipant(prev => ({
        ...prev,
        isFollowing: isNowFollowing,
        followersCount: newFollowerCount,
        followers: newFollowerCount?.toString(),
      }))
    }

    // Update current user's following count
    setUserFollowing(prev => {
      const count = parseInt(prev) || 0
      return (isNowFollowing ? count + 1 : Math.max(0, count - 1)).toString()
    })
  }

  // Centralized favorite action handler - updates cache and triggers scoreboard refresh
  const handleFavoriteActionGlobal = (targetUserId, targetUsername, isNowFavorited) => {
    // Update the cache
    setUserProfilesCache(prev => {
      const key = targetUserId || targetUsername
      if (!key) return prev

      // Find existing entry by ID or username
      let existingKey = targetUserId
      if (!prev[existingKey]) {
        existingKey = Object.keys(prev).find(k => prev[k].username === targetUsername)
      }

      if (existingKey && prev[existingKey]) {
        return {
          ...prev,
          [existingKey]: {
            ...prev[existingKey],
            isFavorited: isNowFavorited,
            lastUpdated: Date.now(),
          }
        }
      }
      return prev
    })

    // Update activeCandidate if it's the same user
    if (activeCandidate && (activeCandidate.id === targetUserId || activeCandidate.userId === targetUserId || activeCandidate.username === targetUsername)) {
      setActiveCandidate(prev => ({
        ...prev,
        isFavorited: isNowFavorited,
      }))
    }

    // Trigger scoreboard refresh so it shows updated favorite state
    setScoreboardRefreshKey(prev => prev + 1)
  }

  const handleNavClick = (page) => {
    const pageIndex = PAGES.indexOf(page)
    if (pageIndex !== -1) {
      // Close all profile overlays when navigating via nav bar
      setShowProfile(false)
      setShowPartyProfile(false)
      setShowParticipantProfile(false)
      setShowComments(false)
      setShowSinglePostView(false)
      setSinglePostViewData(null)
      setActiveCandidate(null)
      setActiveParty(null)
      setActiveParticipant(null)
      setNavHistory([]) // Clear navigation history since we're starting fresh

      setCurrentPage(pageIndex)
      // Clear ballot notification when visiting campaign page
      if (page === 'campaign') {
        setHasBallotNotification(false)
      }
    }
  }

  // Debug: log current state on every render
  console.log('=== APP RENDER ===', {
    currentPage,
    pageName: PAGES[currentPage],
    showProfile,
    showParticipantProfile,
    showPartyProfile,
    showConversationOverlay,
    overlayConversationUser: overlayConversation?.user?.username,
  })

  return (
    <div className="app">
      {/* DEBUG INDICATOR - Hidden for now
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: showConversationOverlay ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)',
        color: showConversationOverlay ? 'black' : 'white',
        padding: '4px 8px',
        fontSize: '10px',
        zIndex: 99999,
        textAlign: 'center',
        fontFamily: 'monospace'
      }}>
        {showConversationOverlay
          ? `CONVERSATION OVERLAY: ${overlayConversation?.user?.username || 'unknown'}`
          : `Page: ${currentPage} (${PAGES[currentPage]}) | Profile: ${showProfile ? 'YES' : 'NO'} | Participant: ${showParticipantProfile ? 'YES' : 'NO'}`
        }
      </div>
      */}

      <div
        className="pages-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${currentPage * 100}%)`,
        }}
      >
        {/* Scoreboard Page */}
        <div className="page">
          <Scoreboard
            onOpenProfile={handleOpenProfile}
            onOpenPartyProfile={handleOpenPartyProfile}
            isActive={currentPage === 0}
            refreshKey={scoreboardRefreshKey}
            currentUserId={currentUser.id}
            userRacesFollowing={userRacesFollowing}
            userRacesCompeting={userRacesCompeting}
            onFavoriteChange={(userId, username, isNowFavorited) => {
              // Update cache when favorites change in scoreboard (no refresh needed - scoreboard has local state)
              setUserProfilesCache(prev => {
                const key = userId || username
                if (!key || !prev[key]) return prev
                return {
                  ...prev,
                  [key]: {
                    ...prev[key],
                    isFavorited: isNowFavorited,
                    lastUpdated: Date.now(),
                  }
                }
              })
            }}
          />
        </div>

        {/* Home Page - Now Reels */}
        <div className="page">
          <div className="reels-feed" ref={reelsFeedRef}>
            {reels.map((reel) => {
              // Per-reel engagement: pick contextually relevant candidates
              let reelScores = reel.engagementScores || topEngagedCandidates
              let reelRaceName = reel.engagementRaceName || engagementRaceName
              if (Object.keys(allRaceScoreboards).length > 0) {
                const result = selectEngagementForReel(reel, allRaceScoreboards, engagementContext.userContext)
                if (result.scores.length > 0) {
                  reelScores = result.scores
                  reelRaceName = result.raceName
                }
              }
              const enrichedReel = {
                ...reel,
                engagementScores: reelScores,
                engagementRaceName: reelRaceName,
              }
              return (
                <ReelCard
                  key={reel.id}
                  reel={enrichedReel}
                  isPageActive={currentPage === 1 && !showCreateScreen && !showProfile && !showPartyProfile && !showParticipantProfile && !showComments}
                  onOpenComments={() => handleOpenComments(reel)}
                  onUsernameClick={handleReelUsernameClick}
                  onPartyClick={handleReelPartyClick}
                  onEngagementClick={handleEngagementClick}
                  onTrackActivity={trackActivity}
                  onRepostChange={(reelId, isReposted) => {
                    console.log('[REPOST-CALLBACK] Callback triggered:', { reelId, isReposted, reelFromMap: reel?.id })
                    handleRepostChange(reelId, isReposted, reel)
                  }}
                  onHide={handleHideReel}
                  userRacesFollowing={userRacesFollowing}
                  hasOptedIn={hasOptedIn}
                  onOptIn={handleOptIn}
                  currentUserId={currentUser.id}
                  userPartyId={userParty?.id}
                  canEnterPartyInRaces={canEnterPartyInRaces}
                  onScoreboardRefresh={() => setScoreboardRefreshKey(prev => prev + 1)}
                  onPostCreated={handlePostCreated}
                  conversations={conversations}
                  userParty={userParty}
                  currentUser={currentUser}
                  userRacesCompeting={userRacesCompeting}
                />
              )
            })}
          </div>
        </div>

        {/* Explore/Search Page */}
        <div className="page">
          <ExplorePage />
        </div>

        {/* Messages Page */}
        <div className="page">
          <Messages
            onConversationChange={setIsInConversation}
            conversations={conversations}
            setConversations={setConversations}
            userStories={userStories}
            isCandidate={!currentUser.isParticipant}
            userParty={userParty}
            currentUser={currentUser}
            startConversationWith={messageTargetUser}
            onConversationStarted={() => setMessageTargetUser(null)}
            isActive={currentPage === 3}
            onViewReel={(reel) => {
              // Navigate to home feed and scroll to the reel
              setCurrentPage(1)

              // Find the reel index and scroll to it
              const reelIndex = reels.findIndex(r => r.id === reel.id)
              if (reelIndex >= 0 && reelsFeedRef.current) {
                // Scroll to the reel after a short delay to ensure page transition
                setTimeout(() => {
                  const reelHeight = window.innerHeight
                  reelsFeedRef.current?.scrollTo({
                    top: reelIndex * reelHeight,
                    behavior: 'smooth'
                  })
                }, 100)
              }
            }}
            onViewComments={(reel) => {
              // Try to find full reel data from our reels state (has videoUrl, etc.)
              const fullReel = reels.find(r => r.id === reel.id) || userPosts.find(r => r.id === reel.id)
              // Merge notification reel data with full reel data
              const enrichedReel = fullReel ? { ...reel, ...fullReel } : reel

              // Navigate to home feed first so reel is underneath comments
              setCurrentPage(1)
              const reelIndex = reels.findIndex(r => r.id === reel.id)
              if (reelIndex >= 0 && reelsFeedRef.current) {
                setTimeout(() => {
                  const reelHeight = window.innerHeight
                  reelsFeedRef.current?.scrollTo({
                    top: reelIndex * reelHeight,
                    behavior: 'instant'
                  })
                }, 50)
              }

              // Then open comments
              setActiveReel(enrichedReel)
              setShowComments(true)
            }}
            onOpenProfile={handleOpenProfile}
            onOpenPartyProfile={handleOpenPartyProfile}
            onTrackActivity={trackActivity}
            onPartyCreatedFromGroupchat={handlePartyCreatedFromGroupchat}
          />
        </div>

        {/* Campaign/Ballot Page */}
        <div className="page">
          <MyBallot onProfileClick={() => setCurrentPage(5)} isActive={currentPage === 4} />
        </div>

        {/* My Profile Page */}
        <div className="page">
          <MyProfile
            onPartyClick={handleOpenPartyProfile}
            onOptIn={handleOptIn}
            onOptOut={handleOptOut}
            userParty={userParty}
            userPosts={userPosts}
            userReposts={userReposts}
            hasOptedIn={hasOptedIn}
            onOpenComments={handleOpenComments}
            userActivity={userActivity}
            currentUser={currentUser}
            onAvatarChange={handleAvatarChange}
            onBioChange={handleBioChange}
            isActive={currentPage === 5}
            engagementScores={topEngagedCandidates}
            engagementRaceName={engagementRaceName}
            engagementContext={engagementContext}
            onRepostChange={handleRepostChange}
          />
        </div>
      </div>

      {!isInConversation && !showCreateScreen && !showConversationOverlay &&
       !showProfile && !showPartyProfile && !showParticipantProfile && (
        <BottomNav
          currentPage={PAGES[currentPage]}
          onNavigate={handleNavClick}
          onCreateClick={() => setShowCreateScreen(true)}
          theme={
            showComments
              ? 'dark'
              : PAGES[currentPage] === 'scoreboard'
                ? 'light'
                : PAGES[currentPage] === 'campaign'
                  ? 'ballot'
                  : 'dark'
          }
          notifications={{ messages: 12, campaign: hasBallotNotification ? 1 : 0 }}
        />
      )}

      {/* Create Screen */}
      {showCreateScreen && (
        <div className="create-screen-container">
          <CreateScreen
            onClose={() => { setShowCreateScreen(false); setCreateScreenSound(null) }}
            initialSound={createScreenSound}
            onPartyCreated={async (partyData) => {
              try {
                // Create party in backend - this persists the party and updates user's affiliation
                const createPayload = {
                  name: partyData.name,
                  handle: partyData.handle,
                  description: partyData.bio || '',
                  isPrivate: partyData.privacy === 'private',
                  chatMode: partyData.type === 'closed' ? 'ADMIN_ONLY' : 'OPEN',
                }
                // Only include avatarUrl if it's a valid non-empty string
                if (partyData.photo && typeof partyData.photo === 'string') {
                  createPayload.avatarUrl = partyData.photo
                }
                console.log('Creating party with payload:', createPayload)
                const response = await partiesApi.createParty(createPayload)

                // Get the created party with its ID from the response
                // Backend returns { party: {...} } wrapped in { data: {...} } or { success: true, data: {...} }
                const createdParty = response.data?.party || response.party || response.data || response

                // Build full party data with all required fields for display
                const fullPartyData = {
                  id: createdParty.id,
                  name: partyData.name,
                  handle: partyData.handle,
                  bio: partyData.bio,
                  photo: partyData.photo,
                  color: partyData.color,
                  type: partyData.type,
                  privacy: partyData.privacy,
                  stats: partyData.stats,
                  isNewParty: true,
                }
                console.log('Party created successfully, setting userParty:', fullPartyData)

                // Update local state with the created party (including ID)
                // This should immediately reflect in MyProfile's profile-party-btn
                setUserParty(fullPartyData)

                // If party has an intro video and post settings, create a post
                if (partyData.introVideo && partyData.postSettings) {
                  const postToArray = Array.isArray(partyData.postSettings.postTo)
                    ? partyData.postSettings.postTo
                    : [partyData.postSettings.postTo || 'Your Feed']

                  // Create the intro reel first via API to get the reel ID
                  let introReelId = null
                  try {
                    const reelData = {
                      videoUrl: partyData.introVideo,
                      title: `Welcome to ${partyData.name}!`,
                      description: partyData.bio || '',
                      partyId: createdParty.id,
                      duration: 30,
                      isMirrored: partyData.introVideoMirrored || false,
                    }
                    console.log('Creating intro reel:', reelData)
                    const reelResult = await reelsApi.createReel(reelData)
                    // Backend returns { success: true, data: { reel: {...} } } or { reel: {...} }
                    const createdReel = reelResult.data?.reel || reelResult.reel || reelResult.data || reelResult
                    introReelId = createdReel?.id
                    console.log('Intro reel created with ID:', introReelId)
                  } catch (reelError) {
                    console.error('Failed to create intro reel:', reelError)
                  }

                  // Now send invites with the reel ID
                  const sendPartyInvites = async () => {
                    const allInvites = []
                    const adminInvites = partyData.adminInvites || []
                    const memberInvites = partyData.memberInvites || []

                    console.log('Sending invites - adminCount:', adminInvites.length, 'memberCount:', memberInvites.length, 'reelId:', introReelId)
                    if (!introReelId) {
                      console.warn('⚠️ No reelId available for invites - action buttons will not save to backend!')
                    }

                    // Send admin invites
                    for (const admin of adminInvites) {
                      allInvites.push(
                        messagesApi.sendMessage({
                          receiverId: admin.id,
                          content: `Party invite: ${partyData.name}`,
                          metadata: {
                            type: 'party_invite',
                            partyId: createdParty.id,
                            partyHandle: partyData.handle,
                            partyName: partyData.name,
                            role: 'admin',
                            partyColor: partyData.color,
                            partyAvatar: partyData.photo,
                            introVideoBase64: partyData.introVideo,
                            introVideoMirrored: partyData.introVideoMirrored,
                            reelId: introReelId, // Include reel ID for action buttons
                          }
                        }).catch(err => console.log(`Failed to send admin invite to ${admin.username}:`, err))
                      )
                    }

                    // Send member invites
                    for (const member of memberInvites) {
                      allInvites.push(
                        messagesApi.sendMessage({
                          receiverId: member.id,
                          content: `Party invite: ${partyData.name}`,
                          metadata: {
                            type: 'party_invite',
                            partyId: createdParty.id,
                            partyHandle: partyData.handle,
                            partyName: partyData.name,
                            role: 'member',
                            partyColor: partyData.color,
                            partyAvatar: partyData.photo,
                            introVideoBase64: partyData.introVideo,
                            introVideoMirrored: partyData.introVideoMirrored,
                            reelId: introReelId, // Include reel ID for action buttons
                          }
                        }).catch(err => console.log(`Failed to send member invite to ${member.username}:`, err))
                      )
                    }

                    // Send all invites in parallel
                    await Promise.all(allInvites)
                    console.log(`Sent ${adminInvites.length} admin invites and ${memberInvites.length} member invites with reelId: ${introReelId}`)
                  }

                  // Send invites (don't block on this)
                  sendPartyInvites()

                  // Also update local state for immediate display
                  const timestamp = Date.now()
                  const newReel = {
                    id: introReelId || `reel-${timestamp}`,
                    videoUrl: partyData.introVideo,
                    thumbnail: partyData.introVideo,
                    user: {
                      ...currentUser,
                      party: fullPartyData.name,
                    },
                    title: `Welcome to ${partyData.name}!`,
                    caption: partyData.bio || '',
                    stats: { votes: '0', likes: '1', comments: '0', shazam: '0', shares: '0' },
                    isLiked: true,
                    targetRace: partyData.postSettings.target || null,
                    createdAt: new Date().toISOString(),
                    isMirrored: partyData.introVideoMirrored || false,
                  }

                  // Add to feed if posting to feed
                  if (postToArray.includes('Your Feed')) {
                    setReels(prev => [newReel, ...prev])
                  }

                  // Add to party posts
                  setPartyPosts(prev => [newReel, ...prev])

                  // Add to user's posts
                  setUserPosts(prev => [newReel, ...prev])

                  setShowCreateScreen(false)
                  setCurrentPage(1)
                } else {
                  setShowCreateScreen(false)
                }
              } catch (error) {
                console.error('Failed to create party:', error)
                // Still set local state as fallback with all required fields
                const fallbackPartyData = {
                  id: `temp-${Date.now()}`,
                  name: partyData.name,
                  handle: partyData.handle,
                  bio: partyData.bio,
                  photo: partyData.photo,
                  color: partyData.color,
                  type: partyData.type,
                  privacy: partyData.privacy,
                  isNewParty: true,
                }
                setUserParty(fallbackPartyData)
                setShowCreateScreen(false)
              }
            }}
            onPostCreated={handlePostCreated}
            userParty={userParty}
            userRacesFollowing={userRacesFollowing}
            userRacesCompeting={userRacesCompeting}
            conversations={conversations}
            currentUserId={authUser?.id}
          />
        </div>
      )}

      {/* Comments overlay - portaled to modal-root to appear above SinglePostView */}
      {showComments && createPortal(
        <CommentsSection
          reel={activeReel}
          onClose={handleCloseComments}
          onUsernameClick={handleCommentUsernameClick}
          onPartyClick={handleCommentPartyClick}
          onCommentAdded={() => {
            // Update the comment count on the active reel
            if (activeReel) {
              setReels(prev => prev.map(r =>
                r.id === activeReel.id
                  ? { ...r, stats: { ...r.stats, comments: (parseInt(r.stats?.comments || '0') + 1).toString() } }
                  : r
              ))
            }
          }}
          onTrackActivity={trackActivity}
        />,
        document.getElementById('modal-root') || document.body
      )}

      {/* SinglePostView - scrollable reel view when accessing from comments/notifications */}
      {showSinglePostView && singlePostViewData && (
        <div className="single-post-view-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: '430px',
          margin: '0 auto',
          zIndex: 1500,
          background: '#000',
        }}>
          <SinglePostView
            posts={singlePostViewData.posts}
            initialIndex={singlePostViewData.initialIndex}
            onClose={() => {
              setShowSinglePostView(false)
              setSinglePostViewData(null)
            }}
            onUsernameClick={handleReelUsernameClick}
            onPartyClick={handleReelPartyClick}
            onOpenComments={handleOpenComments}
            onTrackActivity={trackActivity}
            engagementScores={topEngagedCandidates}
            engagementRaceName={engagementRaceName}
            engagementContext={engagementContext}
            profileName="Feed"
          />
        </div>
      )}

      {/* Candidate Profile overlay */}
      {showProfile && (
        <div className="profile-overlay" ref={profileOverlayRef}>
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <CandidateProfile
            candidate={activeCandidate}
            onClose={handleCloseProfile}
            onPartyClick={handleOpenPartyProfile}
            onUserClick={handleOpenProfile}
            onOpenComments={handleOpenComments}
            userActivity={userActivity}
            engagementScores={topEngagedCandidates}
            engagementRaceName={engagementRaceName}
            onRepostChange={handleRepostChange}
            engagementContext={engagementContext}
            isOwnProfile={activeCandidate?.username === currentUser.username || activeCandidate?.id === currentUser.id || activeCandidate?.userId === currentUser.id}
            cachedProfile={getCachedUserProfile(activeCandidate?.id || activeCandidate?.userId || activeCandidate?.username)}
            onProfileLoaded={(profileData) => updateUserProfileCache(profileData.id || profileData.userId, profileData)}
            onFollowChange={(isNowFollowing, newFollowerCount) => {
              handleFollowActionGlobal(
                activeCandidate?.id || activeCandidate?.userId,
                activeCandidate?.username,
                isNowFollowing,
                newFollowerCount
              )
            }}
            onFavoriteChange={(isNowFavorited) => {
              handleFavoriteActionGlobal(
                activeCandidate?.id || activeCandidate?.userId,
                activeCandidate?.username,
                isNowFavorited
              )
            }}
            onMessageUser={(user) => {
              console.log('=== APP.JSX onMessageUser HANDLER ===')
              console.log('User data received:', user)

              // Close ALL profile overlays
              setShowProfile(false)
              setShowParticipantProfile(false)
              setShowPartyProfile(false)
              setShowComments(false)

              // Create conversation object and show as overlay
              const conversation = {
                id: `new-${user.id}`,
                user: {
                  id: user.id,
                  username: user.username,
                  avatar: user.avatar,
                  displayName: user.displayName || user.username,
                },
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                lastMessage: '',
                timestamp: 'now',
                unreadCount: 0,
                hasUnread: false,
                isOnline: false,
                isNew: true,
              }
              setOverlayConversation(conversation)
              setShowConversationOverlay(true)
              console.log('Opening conversation overlay with:', user.username)
            }}
            onUserTypeChange={handleUserTypeChange}
            onOptOut={handleOptOut}
            onOptIn={handleOptIn}
          />
        </div>
      )}

      {/* Party Profile overlay */}
      {showPartyProfile && (
        <div className="profile-overlay">
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <PartyProfile
              party={activeParty}
              onMemberClick={handleOpenProfile}
              onOpenComments={handleOpenComments}
              isOwnParty={userParty && (activeParty?.name === userParty.name || activeParty?.handle === userParty.handle)}
              onPartyJoined={refreshConversations}
              engagementScores={topEngagedCandidates}
              engagementRaceName={engagementRaceName}
              engagementContext={engagementContext}
              onRepostChange={handleRepostChange}
            />
          </div>
        </div>
      )}

      {/* Participant Profile overlay */}
      {showParticipantProfile && (
        <div className="profile-overlay">
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <ParticipantProfile
              participant={activeParticipant}
              isOwnProfile={isOwnParticipantProfile}
              onPartyClick={handleOpenPartyProfile}
              onOptIn={handleOptIn}
              engagementScores={topEngagedCandidates}
              engagementRaceName={engagementRaceName}
              engagementContext={engagementContext}
              onRepostChange={handleRepostChange}
              cachedProfile={getCachedUserProfile(activeParticipant?.id || activeParticipant?.userId || activeParticipant?.username)}
              onProfileLoaded={(profileData) => updateUserProfileCache(profileData.id || profileData.userId, profileData)}
              onFollowChange={(isNowFollowing, newFollowerCount) => {
                handleFollowActionGlobal(
                  activeParticipant?.id || activeParticipant?.userId,
                  activeParticipant?.username,
                  isNowFollowing,
                  newFollowerCount
                )
              }}
              onMessageUser={(user) => {
                console.log('=== APP.JSX onMessageUser HANDLER (Participant) ===')
                console.log('User data received:', user)

                // Close ALL profile overlays
                setShowProfile(false)
                setShowParticipantProfile(false)
                setShowPartyProfile(false)
                setShowComments(false)

                // Create conversation object and show as overlay
                const conversation = {
                  id: `new-${user.id}`,
                  user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    displayName: user.displayName || user.username,
                  },
                  userId: user.id,
                  username: user.username,
                  avatar: user.avatar,
                  lastMessage: '',
                  timestamp: 'now',
                  unreadCount: 0,
                  hasUnread: false,
                  isOnline: false,
                  isNew: true,
                }
                setOverlayConversation(conversation)
                setShowConversationOverlay(true)
                console.log('Opening conversation overlay with:', user.username)
              }}
              onAvatarChange={handleAvatarChange}
              onBioChange={handleBioChange}
              onUserTypeChange={handleUserTypeChange}
            />
          </div>
        </div>
      )}

      {/* Conversation Overlay - renders on top of everything when messaging from profile */}
      {showConversationOverlay && overlayConversation && (
        <div className="conversation-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: '430px',
          margin: '0 auto',
          zIndex: 2000,
          background: '#0f0f11',
        }}>
          <Conversation
            conversation={overlayConversation}
            onBack={() => {
              setShowConversationOverlay(false)
              setOverlayConversation(null)
            }}
            sharedConversations={conversations}
            setSharedConversations={setConversations}
            onMessageSent={(data) => {
              // Update the overlay conversation with the real ID
              if (data.isNew) {
                setOverlayConversation(prev => ({
                  ...prev,
                  id: data.conversationId,
                  isNew: false,
                }))
              }
            }}
            currentUserId={currentUser?.id}
            currentUserAvatar={currentUser?.avatar}
            onPartyCreatedFromGroupchat={handlePartyCreatedFromGroupchat}
            onOpenProfile={handleOpenProfile}
            onOpenPartyProfile={handleOpenPartyProfile}
          />
        </div>
      )}
    </div>
  )
}

// Wrap App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
