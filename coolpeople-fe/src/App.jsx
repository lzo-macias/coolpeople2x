import { useState, useRef, useEffect } from 'react'
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
import CreateScreen from './components/CreateScreen'
import Login from './components/Login'
import Register from './components/Register'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { reelsApi, messagesApi, partiesApi, storiesApi, usersApi } from './services/api'
import { mockReels, mockPartyProfiles, mockConversations, mockMessages, generateSparklineData } from './data/mockData'

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
  const [reels, setReels] = useState([...mockReels]) // All posts in feed - fallback to mock
  const [userPosts, setUserPosts] = useState([]) // Current user's posts
  const [partyPosts, setPartyPosts] = useState([]) // Posts to user's party
  const [userStories, setUserStories] = useState([]) // User's stories (nominations)
  const [conversations, setConversations] = useState({ ...mockConversations }) // Chat messages by conversation ID
  const [userActivity, setUserActivity] = useState([]) // Track all user actions for details page
  const [isLoading, setIsLoading] = useState(false)
  const [partyProfiles, setPartyProfiles] = useState({ ...mockPartyProfiles }) // Party profiles cache
  const [navHistory, setNavHistory] = useState([])

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
        if (profile.racesFollowing) setUserRacesFollowing(profile.racesFollowing.map(r => r.id || r))
        if (profile.racesCompeting) setUserRacesCompeting(profile.racesCompeting.map(r => r.id || r))
        if (profile.userType === 'CANDIDATE') setHasOptedIn(true)
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

  const handleOpenPartyProfile = (partyName) => {
    // First check if it's the user's created party
    if (userParty && (partyName === userParty.name || partyName === userParty.handle)) {
      // Build party profile data from user's party with their posts
      const partyStats = userParty.stats || {
        members: 1,
        followers: 0,
        posts: partyPosts.length,
        cpPoints: 100,
        tier: 'Bronze',
        change: '+0.00',
        chartChange: '+0.0%',
        sparklineData: [100, 100, 100, 100, 100, 100, 100],
        ranking: 'New'
      }
      const userPartyProfile = {
        name: userParty.name,
        handle: userParty.handle,
        color: userParty.color,
        type: userParty.type,
        avatar: userParty.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userParty.name)}&background=${userParty.color.replace('#', '')}&color=fff&size=150`,
        bio: userParty.bio || `Welcome to ${userParty.name}! A new political party making a difference.`,
        // Top-level members/followers for compatibility with mockParty merge
        members: partyStats.members,
        followers: partyStats.followers,
        cpPoints: partyStats.cpPoints,
        stats: partyStats,
        posts: partyPosts,
        isUserParty: true,
        // New party baseline data
        isNewParty: userParty.isNewParty !== false, // Default to true for user parties
        races: userParty.races || ['Best Party'],
        testimonials: userParty.testimonials || { cpVerified: [], community: [] },
        icebreakers: userParty.icebreakers || null,
        reviews: userParty.reviews || [],
      }
      saveToHistory()
      setShowComments(false)
      setShowProfile(false)
      setShowParticipantProfile(false)
      setActiveParty(userPartyProfile)
      setShowPartyProfile(true)
      return
    }

    // Check cached party profiles first
    const cachedParty = partyProfiles[partyName]
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
        // Try to find party by name in API
        const response = await partiesApi.getParty(partyName)
        if (response) {
          // Cache the party profile
          setPartyProfiles(prev => ({ ...prev, [partyName]: response }))
          saveToHistory()
          setShowComments(false)
          setShowProfile(false)
          setShowParticipantProfile(false)
          setActiveParty(response)
          setShowPartyProfile(true)
        }
      } catch (error) {
        // Fallback to mock data
        const mockParty = mockPartyProfiles[partyName]
        if (mockParty) {
          saveToHistory()
          setShowComments(false)
          setShowProfile(false)
          setShowParticipantProfile(false)
          setActiveParty(mockParty)
          setShowPartyProfile(true)
        }
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
    saveToHistory()
    setShowComments(false)

    if (comment.profileType === 'candidate') {
      // Open CandidateProfile for users who opted into social credit
      setActiveCandidate({
        username: comment.username,
        avatar: comment.avatar,
        party: comment.party || 'Independent',
      })
      setShowProfile(true)
    } else {
      // Open ParticipantProfile for users who haven't opted in
      setActiveParticipant({
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
    // Engagement scores are candidates (on the scoreboard)
    setActiveCandidate({
      username: score.username,
      avatar: score.avatar,
      party: score.party || 'The Pink Lady Party',
    })
    setShowProfile(true)
  }

  const handleNavClick = (page) => {
    const pageIndex = PAGES.indexOf(page)
    if (pageIndex !== -1) {
      setCurrentPage(pageIndex)
      // Clear ballot notification when visiting campaign page
      if (page === 'campaign') {
        setHasBallotNotification(false)
      }
    }
  }

  return (
    <div className="app">
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
          <Scoreboard onOpenProfile={handleOpenProfile} isActive={currentPage === 0} />
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

      {!isInConversation && !showCreateScreen && (
        <BottomNav
          currentPage={PAGES[currentPage]}
          onNavigate={handleNavClick}
          onCreateClick={() => setShowCreateScreen(true)}
          theme={PAGES[currentPage] === 'scoreboard' ? 'light' : PAGES[currentPage] === 'campaign' ? 'ballot' : 'dark'}
          notifications={{ messages: 12, campaign: hasBallotNotification ? 1 : 0 }}
        />
      )}

      {/* Create Screen */}
      {showCreateScreen && (
        <div className="create-screen-container">
          <CreateScreen
            onClose={() => setShowCreateScreen(false)}
            onPartyCreated={(partyData) => {
              // Set the user's party
              setUserParty(partyData)

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
                }, partyData)
              } else {
                setShowCreateScreen(false)
              }
            }}
            onPostCreated={handlePostCreated}
            userParty={userParty}
            userRacesFollowing={userRacesFollowing}
            userRacesCompeting={userRacesCompeting}
            conversations={conversations}
          />
        </div>
      )}

      {/* Comments overlay */}
      {showComments && (
        <CommentsSection
          reel={activeReel}
          onClose={handleCloseComments}
          onUsernameClick={handleCommentUsernameClick}
          onPartyClick={handleCommentPartyClick}
        />
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
            isOwnProfile={activeCandidate?.username === currentUser.username || activeCandidate?.id === currentUser.id}
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
            />
          </div>
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
