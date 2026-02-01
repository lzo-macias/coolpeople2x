import { useState, useRef, useEffect } from 'react'
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
import { reelsApi, messagesApi, partiesApi, storiesApi, usersApi } from './services/api'
import { initializeSocket, onFollowUpdate, disconnectSocket } from './services/socket'
import { mockReels, mockConversations, mockMessages, generateSparklineData } from './data/mockData'

// Pages: 0 = Scoreboard, 1 = Home/Reels, 2 = Search, 3 = Messages, 4 = Campaign/Ballot, 5 = Profile
const PAGES = ['scoreboard', 'home', 'search', 'messages', 'campaign', 'profile']

function AppContent() {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth()
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
  const [hasBallotNotification, setHasBallotNotification] = useState(true)
  const [userParty, setUserParty] = useState(null) // User's created party
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
  const [partyPosts, setPartyPosts] = useState([]) // Posts to user's party
  const [userStories, setUserStories] = useState([]) // User's stories (nominations)
  const [conversations, setConversations] = useState({ ...mockConversations }) // Chat messages by conversation ID
  const [userActivity, setUserActivity] = useState([]) // Track all user actions for details page
  const [isLoading, setIsLoading] = useState(false)
  const [partyProfiles, setPartyProfiles] = useState({}) // Party profiles cache (populated from API)
  const [userProfilesCache, setUserProfilesCache] = useState({}) // Centralized user profiles cache
  const [scoreboardRefreshKey, setScoreboardRefreshKey] = useState(0) // Triggers scoreboard refetch when changed
  const [messageTargetUser, setMessageTargetUser] = useState(null) // User to start conversation with
  const [showConversationOverlay, setShowConversationOverlay] = useState(false) // Show conversation as overlay
  const [overlayConversation, setOverlayConversation] = useState(null) // Conversation data for overlay
  const [navHistory, setNavHistory] = useState([])
  const [showSinglePostView, setShowSinglePostView] = useState(false) // Show reel in scrollable view
  const [singlePostViewData, setSinglePostViewData] = useState(null) // { posts, initialIndex }

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
  }, [isAuthenticated])

  useEffect(() => {
    const fetchStories = async () => {
      if (!isAuthenticated) return
      try {
        const response = await storiesApi.getFeed()
        if (response.data && response.data.length > 0) {
          setUserStories(response.data)
        }
      } catch (error) {
        console.log('Using mock stories:', error.message)
      }
    }
    fetchStories()
  }, [isAuthenticated])

  // Load user profile data from backend when authenticated
  useEffect(() => {
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
        if (profile.userType === 'CANDIDATE') setHasOptedIn(true)

        // Load user's party if they have one (from new partyId relation)
        console.log('Profile party data:', profile.party)
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

    loadUserProfile()
  }, [authUser?.id])

  // Load user's posts from backend
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!authUser?.id) return

      try {
        const response = await reelsApi.getUserReels(authUser.id)
        const posts = response.data || response
        if (posts && posts.length > 0) {
          setUserPosts(posts)
        }
      } catch (error) {
        console.log('Using local posts:', error.message)
      }
    }

    loadUserPosts()
  }, [authUser?.id])

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
    const activity = {
      id: `act-${Date.now()}`,
      type,
      action: type === 'like' ? 'liked' : type === 'comment' ? 'commented' : type === 'nominate' ? 'nominated' : type === 'repost' ? 'reposted' : type === 'endorse' ? 'endorsed' : type === 'ballot' ? 'added to ballot' : type === 'favorite' ? 'favorited' : type,
      timestamp: 'Just now',
      video: {
        thumbnail: video.thumbnail || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
        videoUrl: video.videoUrl || null, // Keep video URL separate for video playback
        isMirrored: video.isMirrored || false, // Track if video should be mirrored
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

    // Check if this is a nomination (should go to stories)
    if (postData.isNomination) {
      const newStory = {
        id: `story-user-${timestamp}`,
        userId: 'current-user',
        name: currentUser.displayName,
        image: currentUser.avatar,
        hasNew: true,
        party: currentUser.party,
        videoUrl: postData.videoUrl,
        isMirrored: postData.isMirrored || false,
        taggedUser: postData.taggedUser || null,
        createdAt: new Date().toISOString(),
      }

      // Add to user stories
      setUserStories(prev => [newStory, ...prev])

      // Save story to backend
      try {
        await storiesApi.createStory({
          videoUrl: postData.videoUrl,
          isMirrored: postData.isMirrored,
          taggedUser: postData.taggedUser,
        })
      } catch (error) {
        console.error('Failed to save story to backend:', error)
      }
    } else {
      // Regular post goes to feed
      // Generate engagement scores for the sparklines at top
      const defaultEngagementScores = [
        {
          id: `eng-${timestamp}-1`,
          username: currentUser.username,
          avatar: currentUser.avatar,
          party: currentUser.party,
          sparklineData: generateSparklineData('up'),
          recentChange: null,
          trend: 'up',
        },
        {
          id: `eng-${timestamp}-2`,
          username: 'Lzo.macias.formayor',
          avatar: 'https://i.pravatar.cc/40?img=1',
          party: 'Democrat',
          sparklineData: generateSparklineData('up'),
          recentChange: '+1',
          trend: 'up',
        },
        {
          id: `eng-${timestamp}-3`,
          username: 'Sarah.J.Council',
          avatar: 'https://i.pravatar.cc/40?img=5',
          party: 'Republican',
          sparklineData: generateSparklineData('stable'),
          recentChange: null,
          trend: 'stable',
        },
      ]

      const newReel = {
        id: `reel-${timestamp}`,
        videoUrl: postData.videoUrl || null,
        thumbnail: postData.videoUrl || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop',
        user: {
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
      }

      // postTo is now an array for multi-select
      const postToArray = Array.isArray(postData.postTo) ? postData.postTo : [postData.postTo || 'Your Feed']

      // Add to feed if posting to feed
      if (postToArray.includes('Your Feed')) {
        console.log('Adding new reel to feed:', newReel)
        setReels(prev => [newReel, ...prev])
      }

      // Add to party posts if posting to party
      if (effectiveParty && postToArray.some(target => target.includes(effectiveParty.name) || target.includes('Party'))) {
        console.log('Adding to party posts:', newReel)
        setPartyPosts(prev => [newReel, ...prev])
      }

      // Add to user's posts
      console.log('Adding to user posts:', newReel)
      setUserPosts(prev => [newReel, ...prev])

      // Save to backend
      try {
        const reelData = {
          videoUrl: postData.videoUrl,
          title: postData.title || '',
          description: postData.caption || '', // Backend expects 'description' not 'caption'
          partyId: effectiveParty?.id || null,
          duration: 30, // Default duration
          isMirrored: postData.isMirrored || false, // Track front camera mirror state
        }
        // Add raceIds if targeting a race (backend expects array of UUIDs)
        if (postData.targetRace) {
          // If it's a UUID, wrap in array; otherwise skip
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidPattern.test(postData.targetRace)) {
            reelData.raceIds = [postData.targetRace]
          }
        }
        console.log('Saving reel to backend:', reelData)
        const result = await reelsApi.createReel(reelData)
        console.log('Reel saved successfully:', result)
      } catch (error) {
        console.error('Failed to save post to backend:', error)
      }
    }

    // Handle sending to chats
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
    setShowParticipantProfile(false)
    setActiveCandidate(candidate)
    setShowProfile(true)
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

  const handleOptIn = async () => {
    setHasOptedIn(true)
    // Auto-enroll in CoolPeople race when becoming a candidate
    setUserRacesCompeting(prev => prev.includes('CP') ? prev : [...prev, 'CP'])
    handleCloseParticipantProfile()

    // Save to backend
    if (authUser?.id) {
      try {
        await usersApi.becomeCandidate(authUser.id)
      } catch (error) {
        console.error('Failed to become candidate:', error)
      }
    }
  }

  // Handle opting out from candidate back to participant
  const handleOptOut = () => {
    setHasOptedIn(false)
    // Note: Per backend spec, points are frozen (decay still active), reviews remain permanent
    // User can now choose to go private again if they want
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
    // Check if this is the current user
    const isCurrentUser = user.username === currentUser.username ||
                          user.id === currentUser.id ||
                          user.id === authUser?.id

    // If clicking on own username, navigate to MyProfile page
    if (isCurrentUser) {
      setCurrentPage(5) // Profile page
      return
    }

    // Otherwise show the other user's profile overlay
    setActiveCandidate({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
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
    // Check if this is the current user
    const isCurrentUser = score.username === currentUser.username ||
                          score.id === currentUser.id ||
                          score.id === authUser?.id

    // If clicking on own profile, navigate to MyProfile page
    if (isCurrentUser) {
      setCurrentPage(5) // Profile page
      return
    }

    // Engagement scores are candidates (on the scoreboard)
    setActiveCandidate({
      id: score.id,
      username: score.username,
      avatar: score.avatar,
      party: score.party || 'The Pink Lady Party',
    })
    setShowProfile(true)
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
      {/* DEBUG INDICATOR - Remove after debugging */}
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
            {reels.map((reel) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                isPageActive={currentPage === 1 && !showCreateScreen && !showProfile && !showPartyProfile && !showParticipantProfile && !showComments}
                onOpenComments={() => handleOpenComments(reel)}
                onUsernameClick={handleReelUsernameClick}
                onPartyClick={handleReelPartyClick}
                onEngagementClick={handleEngagementClick}
                onTrackActivity={trackActivity}
              />
            ))}
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
              setActiveReel(reel)
            }}
            onViewComments={(reel) => {
              // Try to find full reel data from our reels state (has videoUrl, etc.)
              const fullReel = reels.find(r => r.id === reel.id) || userPosts.find(r => r.id === reel.id)
              // Merge notification reel data with full reel data
              const enrichedReel = fullReel ? { ...reel, ...fullReel } : reel
              setActiveReel(enrichedReel)
              setShowComments(true)
            }}
            onOpenProfile={handleOpenProfile}
            onTrackActivity={trackActivity}
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
            hasOptedIn={hasOptedIn}
            onOpenComments={handleOpenComments}
            userActivity={userActivity}
            currentUser={currentUser}
            onAvatarChange={handleAvatarChange}
            onBioChange={handleBioChange}
          />
        </div>
      </div>

      {!isInConversation && !showCreateScreen && !showConversationOverlay && (
        <BottomNav
          currentPage={PAGES[currentPage]}
          onNavigate={handleNavClick}
          onCreateClick={() => setShowCreateScreen(true)}
          theme={
            // Profile overlays always use dark theme
            (showProfile || showPartyProfile || showParticipantProfile || showComments)
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
            onClose={() => setShowCreateScreen(false)}
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

                  // Create the intro post, passing partyData so it can be added to party posts
                  handlePostCreated({
                    videoUrl: partyData.introVideo,
                    title: `Welcome to ${partyData.name}!`,
                    caption: partyData.bio || '',
                    postTo: postToArray,
                    sendTo: partyData.postSettings.sendTo || [],
                    targetRace: partyData.postSettings.target || null,
                    isMirrored: partyData.introVideoMirrored || false,
                  }, fullPartyData)
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
          onViewReel={(reel) => {
            // Close comments and open SinglePostView with the reel
            setShowComments(false)
            // Find the reel index in our posts, or create a list with just this reel
            const allPosts = [...reels, ...userPosts.filter(p => !reels.find(r => r.id === p.id))]
            const reelIndex = allPosts.findIndex(r => r.id === reel.id)
            if (reelIndex >= 0) {
              setSinglePostViewData({ posts: allPosts, initialIndex: reelIndex })
            } else {
              // Reel not in our lists, show just this reel
              setSinglePostViewData({ posts: [reel], initialIndex: 0 })
            }
            setShowSinglePostView(true)
          }}
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
