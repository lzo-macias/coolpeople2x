import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styling/CandidateProfile.css'
import Sparkline from './Sparkline'
import { getPartyColor, generateSparklineData } from '../data/mockData'
import EditProfile from './EditProfile'
import SinglePostView from './SinglePostView'
import { usersApi, reelsApi, reviewsApi, favoritesApi } from '../services/api'

// CoolPeople Tier System
const CP_TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#a67c52', icon: '/icons/tiers/dark/bronze.svg' },
  { name: 'Silver', min: 1000, max: 2499, color: '#b8b8b8', icon: '/icons/tiers/dark/silver.svg' },
  { name: 'Gold', min: 2500, max: 4999, color: '#d4a000', icon: '/icons/tiers/dark/gold.svg' },
  { name: 'Diamond', min: 5000, max: 9999, color: '#5b9bd5', icon: '/icons/tiers/dark/diamond.svg' },
  { name: 'Challenger', min: 10000, max: 24999, color: '#9b59b6', icon: '/icons/tiers/dark/challenger.svg' },
  { name: 'Master', min: 25000, max: Infinity, color: '#e74c3c', icon: '/icons/tiers/dark/master.svg' },
]

const getCurrentTier = (points) => {
  return CP_TIERS.find(tier => points >= tier.min && points <= tier.max) || CP_TIERS[0]
}

const getNextTier = (points) => {
  const currentIndex = CP_TIERS.findIndex(tier => points >= tier.min && points <= tier.max)
  return currentIndex < CP_TIERS.length - 1 ? CP_TIERS[currentIndex + 1] : null
}

// Mock data for the candidate profile
const mockCandidate = {
  id: 'user-1',
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: 'The Pink Lady Party',
  nominations: '9,999',
  followers: '1M',
  change: '+301.26',
  cpPoints: 3247, // CoolPeople points - determines tier
  // Races the candidate is competing in (CP is always included for social credit users)
  races: ['CP', 'NYC Mayor 2024', 'City Council District 5'],
  newRacesCount: 2, // Number of new races since last viewed
  isFollowing: false,
  isFavorited: false,
  sparklineData: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
  filteredSparklineData: [50, 52, 48, 55, 58, 54, 60, 63, 59, 67, 70, 68, 74, 76, 80, 78, 84, 86, 89, 92],
  bio: 'Running for Mayor. Building a better tomorrow for our community.',
  postImages: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=600&fit=crop',
  ],
}

// Race data for CP filtering - everyone in social credit is in CP race
const raceData = {
  'CP': {
    cpPoints: 3247,
    change: '+87.50',
    tier: 'Gold'
  },
  'NYC Mayor 2024': {
    cpPoints: 1850,
    change: '+42.30',
    tier: 'Silver'
  },
  'City Council District 5': {
    cpPoints: 4200,
    change: '-15.20',
    tier: 'Gold'
  },
  'State Assembly': {
    cpPoints: 890,
    change: '+120.00',
    tier: 'Bronze'
  },
}

// CP paid nominations (verified paid reviews)
const paidNominations = [
  {
    id: 'nom-1',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'Democrat',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
    isPaid: true,
    tag: 'honesty',
  },
  {
    id: 'nom-2',
    user: {
      username: 'hi.its.mario',
      avatar: 'https://i.pravatar.cc/40?img=33',
      party: 'Republican',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '1 day ago',
    media: null,
    isPaid: true,
    tag: 'generosity',
  },
  {
    id: 'nom-3',
    user: {
      username: 'lolo.macias',
      avatar: 'https://i.pravatar.cc/40?img=44',
      party: 'The Pink Lady Party',
    },
    text: '',
    rating: 4,
    timestamp: '1 day ago',
    media: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop',
    isPaid: true,
    tag: 'humour',
  },
  {
    id: 'nom-4',
    user: {
      username: 'alex.jones',
      avatar: 'https://i.pravatar.cc/40?img=52',
      party: 'Independent',
    },
    text: 'Great candidate, always shows up for the community events',
    rating: 5,
    timestamp: '3 days ago',
    media: null,
    isPaid: true,
    tag: 'leadership',
  },
]

// Initial profile content sections data (for established profiles)
const initialProfileSections = {
  topicsThatEnergize: {
    title: 'Topics that energize me',
    tags: ['Healthcare', 'Trans Rights', 'Immigration', 'Affordability', 'Education'],
  },
  guessWhichTrue: {
    title: 'Guess Which One is True',
    options: [
      'I saved a puppy from drowning at the park',
      'Beat up an assailant and defended two women',
      'I grew up very poor in the projects and won a bunch of scholarships',
    ],
    correctIndex: 2, // The third option is true
  },
  customWritten: [
    { prompt: 'The hill I will die on', response: 'Free healthcare for all New Yorkers' },
    { prompt: 'One accomplishment I\'m proud of', response: 'Led a successful campaign to increase voter registration by 40% in my district through grassroots organizing.' },
  ],
  customSliders: [
    { prompt: 'My views on ICE', value: 7 },
    { prompt: 'My views on trans rights', value: 7 },
  ],
  recentPost: {
    username: 'William.Hiya',
    timestamp: '2 weeks ago',
    media: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  },
}

// Empty profile sections for starter users who just opted in
const emptyProfileSections = {
  topicsThatEnergize: {
    title: 'Topics that energize me',
    tags: [],
  },
  guessWhichTrue: {
    title: 'Guess Which One is True',
    options: ['', '', ''],
    correctIndex: null,
  },
  customWritten: [],
  customSliders: [],
  recentPost: null,
}

// Activity feed for Details tab - shows videos with action indicators
const activityFeed = [
  {
    id: 'act-1',
    type: 'like',
    action: 'liked',
    timestamp: '2h ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
      user: { username: 'maya.2024', avatar: 'https://i.pravatar.cc/40?img=44', party: 'Democrat' },
      race: 'NYC Mayor 2024',
      likes: '12.4K',
      comments: '892',
      shares: '2.1K',
      caption: 'Making moves for our community 🗳️',
    },
  },
  {
    id: 'act-2',
    type: 'nominate',
    action: 'nominated',
    timestamp: '5h ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=700&fit=crop',
      user: { username: 'Sara.playa', avatar: 'https://i.pravatar.cc/40?img=23', party: 'The Pink Lady' },
      race: 'City Council District 5',
      likes: '8.2K',
      comments: '456',
      shares: '1.3K',
      caption: 'Together we rise ✊',
    },
  },
  {
    id: 'act-3',
    type: 'comment',
    action: 'commented',
    comment: 'This is exactly what we need!',
    timestamp: '1d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=700&fit=crop',
      user: { username: 'politico.daily', avatar: 'https://i.pravatar.cc/40?img=33', party: null },
      race: 'School Board Election',
      likes: '24.1K',
      comments: '1.2K',
      shares: '4.5K',
      caption: 'Democracy in action',
    },
  },
  {
    id: 'act-4',
    type: 'repost',
    action: 'reposted',
    timestamp: '1d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&h=700&fit=crop',
      user: { username: 'community.voice', avatar: 'https://i.pravatar.cc/40?img=55', party: 'Democrat' },
      race: 'State Assembly',
      likes: '5.7K',
      comments: '234',
      shares: '890',
      caption: 'Spreading the word 📢',
    },
  },
  {
    id: 'act-5',
    type: 'endorsement',
    action: 'endorsed',
    timestamp: '2d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=700&fit=crop',
      user: { username: 'Maya.2024', avatar: 'https://i.pravatar.cc/40?img=44', party: 'The Pink Lady' },
      race: 'Borough President',
      likes: '15.3K',
      comments: '678',
      shares: '2.8K',
      caption: 'Endorsed and proud 🌟',
    },
  },
  {
    id: 'act-6',
    type: 'ballot',
    action: 'added to ballot',
    timestamp: '3d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=700&fit=crop',
      user: { username: 'alex.votes', avatar: 'https://i.pravatar.cc/40?img=60', party: 'Republican' },
      race: 'Public Advocate',
      likes: '9.8K',
      comments: '543',
      shares: '1.6K',
      caption: 'Your vote matters',
    },
  },
  {
    id: 'act-7',
    type: 'favorite',
    action: 'favorited',
    timestamp: '4d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=700&fit=crop',
      user: { username: 'pinklady.official', avatar: 'https://i.pravatar.cc/40?img=47', party: 'The Pink Lady' },
      race: 'NYC Mayor 2024',
      likes: '31.2K',
      comments: '2.1K',
      shares: '5.4K',
      caption: 'Official party content 💖',
    },
  },
  {
    id: 'act-8',
    type: 'like',
    action: 'liked',
    timestamp: '5d ago',
    video: {
      thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop',
      user: { username: 'foodie.voter', avatar: 'https://i.pravatar.cc/40?img=36', party: null },
      race: 'City Comptroller',
      likes: '4.5K',
      comments: '189',
      shares: '567',
      caption: 'Politics & good food 🍽️',
    },
  },
]

// Activity type colors and icons
const activityConfig = {
  like: { color: '#FF4D6A', icon: '♥' },
  nominate: { color: '#00F2EA', icon: '★' },
  repost: { color: '#4CAF50', icon: '↻' },
  comment: { color: '#FFB800', icon: '💬' },
  endorsement: { color: '#9B59B6', icon: '✓' },
  ballot: { color: '#FF9500', icon: '☐' },
  favorite: { color: '#FFD700', icon: '★' },
  follow: { color: '#3B82F6', icon: '👤' },
  review: { color: '#F59E0B', icon: '⭐' },
  invite: { color: '#10B981', icon: '✉' },
  message: { color: '#8B5CF6', icon: '💬' },
  race: { color: '#EC4899', icon: '🏁' },
  mention: { color: '#06B6D4', icon: '@' },
  share: { color: '#14B8A6', icon: '↗' },
}

// Regular nominations (free community reviews)
const regularNominations = [
  {
    id: 'nom-4',
    user: {
      username: 'Sara.playa',
      avatar: 'https://i.pravatar.cc/40?img=23',
      party: 'Democrat',
    },
    text: 'William went to my college absolutely stand out gentleman',
    rating: 3,
    timestamp: '2 weeks ago',
    media: null,
    isPaid: false,
    tag: 'police',
  },
  {
    id: 'nom-5',
    user: {
      username: 'alex.jones',
      avatar: 'https://i.pravatar.cc/40?img=55',
      party: null, // Independent - no party affiliation
    },
    text: 'Great leader with a clear vision for our community',
    rating: 4,
    timestamp: '3 days ago',
    media: null,
    isPaid: false,
    tag: 'honesty',
  },
]

function CandidateProfile({ candidate: passedCandidate, onClose, onPartyClick, onUserClick, onOpenComments, userActivity = [], isOwnProfile = false, isStarter = false, onEditIcebreakers, onOptOut, onAvatarChange, onBioChange, onFollowChange, onFavoriteChange, onMessageUser, cachedProfile, onProfileLoaded }) {
  // State for fetched profile data
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetchedPosts, setFetchedPosts] = useState([])
  const [fetchedReposts, setFetchedReposts] = useState([])
  const [fetchedReviews, setFetchedReviews] = useState([])
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Fetch real profile data from API
  useEffect(() => {
    // If we have cached data, use it immediately while fetching fresh data
    if (cachedProfile) {
      setFetchedProfile(cachedProfile)
      setLocalFollowerCount(cachedProfile.followersCount || cachedProfile.followers)
      setIsLoadingProfile(false)
    }

    // Reset state when profile changes (but preserve cache data above)
    if (!cachedProfile) {
      setFetchedProfile(null)
      setLocalFollowerCount(null)
    }
    setFetchedPosts([])
    setFetchedReposts([])
    setFetchedReviews([])

    const fetchProfileData = async () => {
      const userId = passedCandidate?.userId || passedCandidate?.id
      if (!userId) {
        setIsLoadingProfile(false)
        return
      }

      setIsLoadingProfile(true)
      try {
        // Fetch user profile
        const profileRes = await usersApi.getUser(userId)
        // Backend returns { success: true, data: { user: profile } }
        const profileData = profileRes.data?.user || profileRes.user || profileRes.data || profileRes
        setFetchedProfile(profileData)

        // Update the centralized cache with fresh data
        if (onProfileLoaded && profileData) {
          onProfileLoaded({
            ...profileData,
            id: profileData.id || userId,
            userId: profileData.userId || userId,
          })
        }

        // Fetch user's posts
        const postsRes = await reelsApi.getUserReels(userId)
        const postsData = postsRes.data || postsRes.reels || postsRes || []
        setFetchedPosts(Array.isArray(postsData) ? postsData : [])

        // Fetch user's reposts
        try {
          const repostsRes = await reelsApi.getUserReposts(userId)
          const repostsData = repostsRes.data || repostsRes.reels || repostsRes || []
          setFetchedReposts(Array.isArray(repostsData) ? repostsData : [])
        } catch (e) {
          // Reposts may fail for some users
          setFetchedReposts([])
        }

        // Fetch user's reviews (if candidate)
        try {
          const reviewsRes = await reviewsApi.getUserReviews(userId)
          const reviewsData = reviewsRes.data || reviewsRes.reviews || reviewsRes || []
          setFetchedReviews(Array.isArray(reviewsData) ? reviewsData : [])
        } catch (e) {
          // Reviews may not exist for all users
          setFetchedReviews([])
        }
      } catch (error) {
        console.log('Failed to fetch profile:', error.message)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfileData()
  }, [passedCandidate?.userId, passedCandidate?.id])

  // Build candidate object from fetched data, falling back to passed data, then minimal defaults
  const candidate = useMemo(() => {
    const defaults = {
      username: 'User',
      avatar: null,
      party: 'Independent',
      followers: '0',
      following: '0',
      cpPoints: 0,
      change: '+0.00',
      races: [],
      bio: '',
      sparklineData: [],
      postImages: [],
      isFollowing: false,
      isFavorited: false,
    }

    // Use fetched profile data if available
    if (fetchedProfile) {
      // Merge race data with points to get position info
      const racesCompetingWithPoints = (fetchedProfile.racesCompeting || []).map(race => {
        const pointData = fetchedProfile.points?.find(p => p.raceId === race.id)
        return {
          ...race,
          points: pointData?.total || 0,
          tier: pointData?.tier || null,
        }
      })

      return {
        ...defaults,
        ...passedCandidate,
        id: fetchedProfile.id,
        username: fetchedProfile.username || passedCandidate?.username || defaults.username,
        avatar: fetchedProfile.avatarUrl || passedCandidate?.avatar || defaults.avatar,
        party: fetchedProfile.party?.name || fetchedProfile.party || passedCandidate?.party || defaults.party,
        bio: fetchedProfile.bio || passedCandidate?.bio || defaults.bio,
        followers: fetchedProfile.followersCount?.toString() || passedCandidate?.followers || defaults.followers,
        following: fetchedProfile.followingCount?.toString() || passedCandidate?.following || defaults.following,
        cpPoints: fetchedProfile.points?.[0]?.total || passedCandidate?.score || defaults.cpPoints,
        change: passedCandidate?.change || defaults.change,
        races: fetchedProfile.points?.map(p => p.raceName) || passedCandidate?.races || defaults.races,
        racesCompeting: racesCompetingWithPoints,
        racesFollowing: fetchedProfile.racesFollowing || passedCandidate?.racesFollowing || [],
        racesWon: fetchedProfile.racesWon || passedCandidate?.racesWon || [],
        sparklineData: passedCandidate?.sparklineData || defaults.sparklineData,
        postImages: fetchedPosts.map(p => p.thumbnailUrl || p.thumbnail).filter(Boolean),
        posts: fetchedPosts,
        reviews: fetchedReviews,
        averageRating: fetchedProfile.averageRating || 0,
        reviewsCount: fetchedProfile.reviewsCount || fetchedReviews.length || 0,
        isFollowing: fetchedProfile.isFollowing ?? passedCandidate?.isFollowing ?? defaults.isFollowing,
        isFavorited: fetchedProfile.isFavorited ?? passedCandidate?.isFavorited ?? defaults.isFavorited,
        userType: fetchedProfile.userType,
      }
    }

    // Fallback to passed candidate with minimal defaults (no mock data)
    // Map 'score' from scoreboard to 'cpPoints' for consistency
    // Map 'userId' from scoreboard to 'id' for consistency
    return {
      ...defaults,
      ...passedCandidate,
      id: passedCandidate?.userId || passedCandidate?.id,
      cpPoints: passedCandidate?.score || passedCandidate?.cpPoints || defaults.cpPoints,
      racesCompeting: passedCandidate?.racesCompeting || [],
      racesFollowing: passedCandidate?.racesFollowing || [],
      racesWon: passedCandidate?.racesWon || [],
    }
  }, [fetchedProfile, fetchedPosts, fetchedReviews, passedCandidate])

  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  const profileRef = useRef(null)
  const avatarInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedRace, setSelectedRace] = useState('CP')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isNominated, setIsNominated] = useState(false)
  const [nominatedRaces, setNominatedRaces] = useState({})
  const [showNominateModal, setShowNominateModal] = useState(false)
  const [hasSeenNewRaces, setHasSeenNewRaces] = useState(false)
  const [showDotsMenu, setShowDotsMenu] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isSilenced, setIsSilenced] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [showEditBio, setShowEditBio] = useState(false)
  const [showBioTextEdit, setShowBioTextEdit] = useState(false)
  const [bioText, setBioText] = useState('')
  const [editInitialSection, setEditInitialSection] = useState(null)
  const [profileSections, setProfileSections] = useState(() => {
    // Always show empty sections since we don't have icebreakers API yet
    // Mock data should only be used when explicitly testing/developing
    return emptyProfileSections
  })
  const [isLocalToCandidate] = useState(true)
  const [guessState, setGuessState] = useState({
    selected: null,
    transitioning: false,
    revealed: false
  })
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [reviewResponses, setReviewResponses] = useState({})
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState('1M')
  const [showAllVerifiedReviews, setShowAllVerifiedReviews] = useState(false)
  const [cpCardExpanded, setCpCardExpanded] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showRacesModal, setShowRacesModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [communityReviews, setCommunityReviews] = useState([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [followersState, setFollowersState] = useState([])
  const [followingState, setFollowingState] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const [icebreakersOrder, setIcebreakersOrder] = useState([])
  const [dropPosition, setDropPosition] = useState(null)
  const [localFollowerCount, setLocalFollowerCount] = useState(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // Scroll to top when candidate changes
  useEffect(() => {
    if (profileRef.current) {
      profileRef.current.scrollTo(0, 0)
    }
  }, [passedCandidate?.username])

  // Sync following/favorited state with candidate data
  useEffect(() => {
    setIsFollowing(candidate.isFollowing || false)
    setIsFavorited(candidate.isFavorited || false)
    setLocalFollowerCount(null) // Reset local count when candidate changes
  }, [candidate.isFollowing, candidate.isFavorited])

  // Handle follow/unfollow with API call
  const handleFollowToggle = async () => {
    const userId = candidate.id || candidate.userId
    if (isFollowLoading || !userId) {
      console.error('Cannot follow: missing user ID or already loading')
      return
    }

    setIsFollowLoading(true)
    const wasFollowing = isFollowing

    // Optimistic update
    setIsFollowing(!wasFollowing)
    const currentFollowers = localFollowerCount ?? (parseInt(candidate.followers) || 0)
    setLocalFollowerCount(wasFollowing ? currentFollowers - 1 : currentFollowers + 1)

    try {
      if (wasFollowing) {
        await usersApi.unfollowUser(userId)
      } else {
        await usersApi.followUser(userId)
      }
      // Notify parent about follow change with new follower count for global cache update
      const newFollowerCount = wasFollowing ? currentFollowers - 1 : currentFollowers + 1
      onFollowChange?.(!wasFollowing, newFollowerCount)
    } catch (error) {
      // Revert on error
      console.error('Follow toggle failed:', error)
      setIsFollowing(wasFollowing)
      setLocalFollowerCount(currentFollowers)
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Handle favorite/unfavorite with API call
  const handleFavoriteToggle = async () => {
    const userId = candidate.id || candidate.userId
    if (!userId) {
      console.error('Cannot favorite: missing user ID')
      return
    }

    const wasFavorited = isFavorited

    // Optimistic update
    setIsFavorited(!wasFavorited)

    try {
      if (wasFavorited) {
        await favoritesApi.removeFavorite(userId)
      } else {
        await favoritesApi.addFavorite(userId)
      }
      // Notify parent about favorite change for global cache/scoreboard update
      onFavoriteChange?.(!wasFavorited)
    } catch (error) {
      // Revert on error
      console.error('Favorite toggle failed:', error)
      setIsFavorited(wasFavorited)
    }
  }

  // Fetch followers from API
  const fetchFollowers = async () => {
    const userId = candidate.id || candidate.userId
    if (!userId || isLoadingFollowers) return

    setIsLoadingFollowers(true)
    try {
      const response = await usersApi.getFollowers(userId)
      const data = response.data || response
      const followers = data.followers || []
      setFollowersState(followers.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar || f.profilePicture || 'https://i.pravatar.cc/40',
        party: f.party?.name || f.partyName || null,
        isFollowing: f.isFollowing || false,
      })))
    } catch (error) {
      console.error('Failed to fetch followers:', error)
      setFollowersState([])
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  // Fetch following from API
  const fetchFollowing = async () => {
    const userId = candidate.id || candidate.userId
    if (!userId || isLoadingFollowing) return

    setIsLoadingFollowing(true)
    try {
      const response = await usersApi.getFollowing(userId)
      const data = response.data || response
      const following = data.following || []
      setFollowingState(following.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar || f.profilePicture || 'https://i.pravatar.cc/40',
        party: f.party?.name || f.partyName || null,
        isFollowing: f.isFollowing || false,
      })))
    } catch (error) {
      console.error('Failed to fetch following:', error)
      setFollowingState([])
    } finally {
      setIsLoadingFollowing(false)
    }
  }

  // Update community reviews when fetched data arrives
  useEffect(() => {
    if (fetchedReviews && fetchedReviews.length > 0) {
      const transformedReviews = fetchedReviews.map(r => ({
        id: r.id,
        user: {
          username: r.reviewer?.username || 'Anonymous',
          avatar: r.reviewer?.avatarUrl || null,
          party: r.reviewer?.party || null,
        },
        text: r.content || '',
        rating: r.rating || 0,
        timestamp: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently',
        media: null,
        isPaid: false,
        tag: null,
      }))
      setCommunityReviews(transformedReviews)
    }
  }, [fetchedReviews])

  // Sync bioText with fetched profile bio
  useEffect(() => {
    if (fetchedProfile?.bio) {
      setBioText(fetchedProfile.bio)
    } else if (passedCandidate?.bio) {
      setBioText(passedCandidate.bio)
    }
  }, [fetchedProfile?.bio, passedCandidate?.bio])

  // Initialize icebreakers order
  useEffect(() => {
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
    // Always use empty sections since we don't have icebreakers API yet
    const initialOrder = buildIcebreakersArray(emptyProfileSections).map(item => item.id)
    setIcebreakersOrder(initialOrder)
  }, [])

  // Handle avatar file selection for own profile
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onAvatarChange) {
      const imageUrl = URL.createObjectURL(file)
      onAvatarChange(imageUrl)
    }
  }

  // If user is blocked, show unavailable message
  if (passedCandidate?.isBlocked) {
    return (
      <div className="candidate-profile blocked-profile">
        <div className="blocked-content">
          <div className="blocked-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
          </div>
          <h2>User Unavailable</h2>
          <p>This profile is not available</p>
          {onClose && (
            <button className="blocked-back-btn" onClick={onClose}>Go Back</button>
          )}
        </div>
      </div>
    )
  }

  // Show loading state while fetching profile data
  if (isLoadingProfile && !fetchedProfile) {
    return (
      <div className="candidate-profile loading-profile">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  // Mock data for stat modals
  const mockFollowing = [
    { id: 'fol-u1', username: 'Sara.playa', avatar: 'https://i.pravatar.cc/40?img=23', party: 'Democrat' },
    { id: 'fol-u2', username: 'hi.its.mario', avatar: 'https://i.pravatar.cc/40?img=33', party: 'Republican' },
    { id: 'fol-u3', username: 'lolo.macias', avatar: 'https://i.pravatar.cc/40?img=44', party: 'The Pink Lady' },
    { id: 'fol-u4', username: 'alex.jones', avatar: 'https://i.pravatar.cc/40?img=52', party: null },
    { id: 'fol-u5', username: 'maya.2024', avatar: 'https://i.pravatar.cc/40?img=55', party: 'Democrat' },
  ]

  const mockFollowers = [
    { id: 'fol-1', username: 'politico.daily', avatar: 'https://i.pravatar.cc/40?img=60', party: null, isFollowing: true },
    { id: 'fol-2', username: 'community.voice', avatar: 'https://i.pravatar.cc/40?img=61', party: 'Democrat', isFollowing: false },
    { id: 'fol-3', username: 'alex.votes', avatar: 'https://i.pravatar.cc/40?img=62', party: 'Republican', isFollowing: true },
    { id: 'fol-4', username: 'pinklady.official', avatar: 'https://i.pravatar.cc/40?img=47', party: 'The Pink Lady', isFollowing: false },
    { id: 'fol-5', username: 'foodie.voter', avatar: 'https://i.pravatar.cc/40?img=36', party: null, isFollowing: false },
    { id: 'fol-6', username: 'nyc.politics', avatar: 'https://i.pravatar.cc/40?img=38', party: 'Democrat', isFollowing: true },
  ]

  // Convert posts to reel format for SinglePostView with variable engagement scores
  const trends = ['up', 'down', 'stable']
  const mockRaces = ['NYC Mayor 2024', 'City Council District 5', 'State Assembly']
  const defaultPostsAsReels = (candidate.postImages || []).map((item, i) => {
    // Check if item is a full post object or just an image URL
    const isPostObject = typeof item === 'object' && item !== null

    return {
      id: isPostObject ? (item.id || `candidate-post-${i}`) : `candidate-post-${i}`,
      thumbnail: isPostObject ? (item.thumbnail || item.videoUrl) : item,
      videoUrl: isPostObject ? item.videoUrl : null,
      isMirrored: isPostObject ? item.isMirrored : false,
      user: isPostObject && item.user ? item.user : {
        username: candidate.username,
        avatar: candidate.avatar,
        party: candidate.party,
      },
      title: isPostObject ? (item.title || '') : '',
      caption: isPostObject ? (item.caption || '') : '',
      targetRace: isPostObject ? (item.targetRace || null) : mockRaces[i % mockRaces.length],
      stats: isPostObject && item.stats ? item.stats : { votes: '0', likes: '0', comments: '0', shazam: '0', shares: '0' },
      textOverlays: isPostObject ? (item.textOverlays || []) : [],
      engagementScores: isPostObject && item.engagementScores ? item.engagementScores : [
        {
          id: `cand-eng-${i}-1`,
          username: candidate.username,
          avatar: candidate.avatar,
          party: candidate.party,
          sparklineData: generateSparklineData(trends[i % 3]),
          recentChange: i % 2 === 0 ? '+1' : null,
          trend: trends[i % 3],
        },
        {
          id: `cand-eng-${i}-2`,
          username: 'Lzo.macias',
          avatar: 'https://i.pravatar.cc/40?img=1',
          party: 'Democrat',
          sparklineData: generateSparklineData(trends[(i + 1) % 3]),
          recentChange: i % 3 === 0 ? '+2' : null,
          trend: trends[(i + 1) % 3],
        },
        {
          id: `cand-eng-${i}-3`,
          username: 'Sarah.J',
          avatar: 'https://i.pravatar.cc/40?img=5',
          party: 'Republican',
          sparklineData: generateSparklineData(trends[(i + 2) % 3]),
          recentChange: null,
          trend: trends[(i + 2) % 3],
        },
      ],
    }
  })

  // Combine dynamic posts with default posts
  const allPosts = candidate.posts
    ? [...candidate.posts, ...defaultPostsAsReels]
    : defaultPostsAsReels

  // Reposts fetched from API
  const allReposts = fetchedReposts || []

  // Handle post click to open SinglePostView
  const handlePostClick = (index) => {
    setSelectedPostIndex(index)
    setShowSinglePost(true)
  }

  // Handle like change from SinglePostView - updates local post state immediately
  const handlePostLikeChange = (reelId, liked) => {
    setFetchedPosts(prev => prev.map(post => {
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
    setFetchedPosts(prev => prev.map(post => {
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

  // Get ordered icebreakers based on current order
  const getOrderedIcebreakers = () => {
    const items = buildIcebreakersArray(profileSections)
    const itemMap = {}
    items.forEach(item => { itemMap[item.id] = item })

    // Return items in order, filtering out any that no longer exist
    const ordered = icebreakersOrder
      .filter(id => itemMap[id])
      .map(id => itemMap[id])

    // Add any new items not in the order
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
    setDropPosition(null)
  }

  const handleDragOver = (e, itemId) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== itemId) {
      setDragOverItem(itemId)

      // Determine if dropping above or below based on mouse position
      const rect = e.currentTarget.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      setDropPosition(e.clientY < midpoint ? 'above' : 'below')
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
    setDropPosition(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const newOrder = [...icebreakersOrder]
    const draggedIndex = newOrder.indexOf(draggedItem)
    let targetIndex = newOrder.indexOf(targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged item first
    newOrder.splice(draggedIndex, 1)

    // Recalculate target index after removal
    targetIndex = newOrder.indexOf(targetId)

    // Insert above or below based on drop position
    if (dropPosition === 'below') {
      targetIndex += 1
    }

    newOrder.splice(targetIndex, 0, draggedItem)

    setIcebreakersOrder(newOrder)
    setDraggedItem(null)
    setDragOverItem(null)
    setDropPosition(null)
  }

  const partyColor = getPartyColor(candidate.party)

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


  // Handle guess selection
  const handleGuess = (index) => {
    if (guessState.revealed || guessState.transitioning) return // Already revealed or transitioning

    const isCorrect = index === profileSections.guessWhichTrue.correctIndex
    setGuessState({ selected: index, transitioning: true, revealed: false })

    // After 1 second, end transition and reveal correct answer permanently
    setTimeout(() => {
      setGuessState({ selected: index, transitioning: false, revealed: true })
    }, 1000)
  }

  // Get class for guess bubble based on state
  const getGuessClass = (index) => {
    const isCorrect = index === profileSections.guessWhichTrue.correctIndex
    const wasSelected = index === guessState.selected

    // After reveal: only correct answer stays green
    if (guessState.revealed) {
      return isCorrect ? 'correct' : ''
    }

    // During transition
    if (guessState.transitioning) {
      if (wasSelected && isCorrect) {
        return 'correct transitioning'
      }
      if (wasSelected && !isCorrect) {
        return 'incorrect transitioning'
      }
      if (!wasSelected && isCorrect) {
        // Show correct answer when user guessed wrong
        return 'correct'
      }
    }

    return ''
  }

  // Format change value to always show + for positive numbers
  const formatChange = (value) => {
    if (typeof value === 'string') return value
    const num = parseFloat(value)
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)
  }

  const tabs = [
    { name: 'Bio', icon: '/icons/profile/userprofile/bio-icon.svg' },
    { name: 'Posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
    { name: 'Reposts', icon: '/icons/profile/userprofile/tags-icons.svg' },
    { name: 'Details', icon: '/icons/profile/userprofile/details-icon.svg' },
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

  return (
    <div className="candidate-profile" ref={profileRef}>
      {/* Header */}
      <div className="profile-header">
        {/* Favorite star - only show for other profiles */}
        {!isOwnProfile && (
          <button
            className={`favorite-star ${isFavorited ? 'active' : ''}`}
            onClick={handleFavoriteToggle}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? 'url(#grayGradient)' : 'none'} stroke={isFavorited ? 'none' : '#777777'} strokeWidth="2">
              <defs>
                <linearGradient id="grayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#888888" />
                  <stop offset="100%" stopColor="#555555" />
                </linearGradient>
              </defs>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}

        {/* Top row: Avatar column + Stats + Sparkline */}
        <div className="profile-top">
          <div className="profile-left">
            {isOwnProfile && (
              <input
                type="file"
                id="candidate-avatar-file-input"
                ref={avatarInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            )}
            {isOwnProfile && !candidate.avatar ? (
              <label
                htmlFor="candidate-avatar-file-input"
                className="profile-avatar-ring placeholder"
                style={{ borderColor: partyColor, cursor: 'pointer' }}
              >
                <div className="profile-avatar-placeholder">
                  <span>add a profile photo</span>
                </div>
              </label>
            ) : (
              <div
                className="profile-avatar-ring"
                style={{ borderColor: partyColor }}
                onClick={isOwnProfile ? () => avatarInputRef.current?.click() : undefined}
              >
                <img src={candidate.avatar} alt={candidate.username} className="profile-avatar" />
              </div>
            )}
            <div className="profile-info">
              <h2 className="profile-username">{candidate.username}</h2>
              {candidate.party ? (
                <button
                  className="profile-party-btn"
                  onClick={() => onPartyClick?.(candidate.party)}
                >
                  {candidate.party}
                </button>
              ) : (
                <span className="profile-party-text">Independent</span>
              )}
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-stats-grid">
              <div className="stat-item clickable" onClick={() => { setShowFollowingModal(true); fetchFollowing(); }}>
                <span className="stat-number">{candidate.following || '0'}</span>
                <span className="stat-label">Following</span>
              </div>
              <div className="stat-item clickable" onClick={() => { setShowFollowersModal(true); fetchFollowers(); }}>
                <span className="stat-number">{localFollowerCount ?? candidate.followers ?? '0'}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item clickable" onClick={() => setShowRacesModal(true)}>
                <span className="stat-number">
                  {((candidate.racesCompeting?.length || 0) +
                    (candidate.racesFollowing?.length || 0) +
                    (candidate.racesWon?.length || 0)) ||
                    candidate.races?.length || '1'}
                </span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                {/* Always show actual tier based on CP points */}
                {(() => {
                  const tier = getCurrentTier(candidate.cpPoints || 0)
                  return (
                    <>
                      <span className="stat-number starter-tier">
                        <img src={tier.icon} alt={tier.name} className="stat-tier-icon" />
                      </span>
                      <span className="stat-label">{tier.name}</span>
                    </>
                  )
                })()}
              </div>
            </div>
            {isOwnProfile ? (
              candidate.bio ? (
                <button className="profile-bio" onClick={() => setShowBioTextEdit(true)}>{candidate.bio}</button>
              ) : (
                <button className="profile-bio empty" onClick={() => setShowBioTextEdit(true)}>Add Bio</button>
              )
            ) : (
              candidate.bio && <p className="profile-bio">{candidate.bio}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {isOwnProfile ? (
            <>
              <button className="profile-action-btn share" onClick={() => setShowShareModal(true)}>share</button>
              <button className="profile-action-btn edit" onClick={() => setShowEditBio(true)}>edit</button>
              <button className="profile-action-icon invite">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                className="profile-action-btn messages"
                onClick={() => {
                  console.log('=== MESSAGE BUTTON CLICKED IN CandidateProfile ===')
                  console.log('passedCandidate:', passedCandidate)
                  console.log('fetchedProfile:', fetchedProfile)
                  console.log('cachedProfile:', cachedProfile)
                  console.log('candidate (computed):', candidate)

                  // Get the actual user ID from passed/fetched data
                  const userId = passedCandidate?.userId || passedCandidate?.id || fetchedProfile?.id || cachedProfile?.id
                  console.log('Extracted userId:', userId)

                  if (!userId) {
                    console.error('Cannot message user: no valid user ID found')
                    return
                  }

                  const messageData = {
                    id: userId,
                    username: candidate.username,
                    avatar: candidate.avatar || candidate.avatarUrl,
                    displayName: candidate.displayName || candidate.username,
                  }
                  console.log('Calling onMessageUser with:', messageData)
                  onMessageUser?.(messageData)
                }}
              >
                Message
              </button>
              <div className="nominate-btn-wrapper">
                <button
                  className={`profile-action-btn nominate ${isNominated ? 'nominated' : ''}`}
                  onClick={() => {
                    if (candidate.races && candidate.races.length > 1) {
                      setShowNominateModal(!showNominateModal)
                      setHasSeenNewRaces(true)
                    } else {
                      setIsNominated(!isNominated)
                    }
                  }}
                >
                  {isNominated ? 'nominated' : 'nominate'}
                  {isNominated && candidate.newRacesCount > 0 && !hasSeenNewRaces && (
                    <span className="new-races-badge">{candidate.newRacesCount}</span>
                  )}
                </button>
                {showNominateModal && (
                  <>
                    <div className="nominate-popup-backdrop" onClick={() => setShowNominateModal(false)} />
                    <div className="nominate-popup">
                      {candidate.races?.map((race) => (
                        <button
                          key={race}
                          className={`nominate-popup-item ${nominatedRaces[race] ? 'selected' : ''}`}
                          onClick={() => {
                            const newNominatedRaces = { ...nominatedRaces, [race]: !nominatedRaces[race] }
                            setNominatedRaces(newNominatedRaces)
                            const hasNominations = Object.values(newNominatedRaces).some(v => v)
                            setIsNominated(hasNominations)
                          }}
                        >
                          <span className="popup-race-name">{race}</span>
                          <span className={`popup-race-check ${nominatedRaces[race] ? 'checked' : ''}`}>
                            {nominatedRaces[race] && '✓'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                className={`profile-action-btn follow ${isFollowing ? 'following' : ''} ${isFollowLoading ? 'loading' : ''}`}
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
              >
                {isFollowing ? 'following' : 'follow'}
              </button>
              <div className="dots-menu-wrapper">
                <button className="profile-action-dots" onClick={() => setShowDotsMenu(!showDotsMenu)}>
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
                {showDotsMenu && (
                  <>
                    <div className="dots-menu-backdrop" onClick={() => setShowDotsMenu(false)} />
                    <div className="dots-menu-popup">
                      <button className="dots-menu-item" onClick={() => { setShowReportModal(true); setShowDotsMenu(false); }}>
                        <span>Report</span>
                      </button>
                      <button className={`dots-menu-item ${isBlocked ? 'active' : ''}`} onClick={() => { setIsBlocked(!isBlocked); setShowDotsMenu(false); }}>
                        <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                      </button>
                      <button className={`dots-menu-item ${isSilenced ? 'active' : ''}`} onClick={() => { setIsSilenced(!isSilenced); setShowDotsMenu(false); }}>
                        <span>{isSilenced ? 'Unsilence' : 'Silence'}</span>
                      </button>
                      <button className="dots-menu-item" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/profile/${candidate.username}`);
                          setShowDotsMenu(false);
                          setShowCopiedToast(true);
                          setTimeout(() => setShowCopiedToast(false), 2000);
                        }}>
                        <span>Share Profile</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className={`profile-tabs ${activeTab === 'posts' || activeTab === 'reposts' || activeTab === 'details' ? 'posts-active' : ''}`}>
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
      <div className={`profile-content ${activeTab === 'posts' || activeTab === 'reposts' || activeTab === 'details' ? 'posts-active' : ''}`}>
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="posts-grid">
            {allPosts.map((post, index) => (
              <div
                key={post.id || index}
                className="post-item"
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
                  <img src={post.thumbnail || post} alt={`Post ${index + 1}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reposts Tab */}
        {activeTab === 'reposts' && (
          <div className="posts-grid">
            {allReposts.length > 0 ? (
              allReposts.map((repost, index) => (
                <div
                  key={repost.id || index}
                  className="post-item repost-item"
                  onClick={() => {
                    // Open the reposted reel in SinglePostView
                    setSelectedPostIndex(index)
                    setShowSinglePost(true)
                  }}
                >
                  <div className="repost-indicator">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 1l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <path d="M7 23l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </div>
                  {repost.videoUrl ? (
                    <video
                      src={repost.videoUrl}
                      className={repost.isMirrored ? 'mirrored' : ''}
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => e.target.play()}
                      onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                  ) : (
                    <img src={repost.thumbnailUrl || repost.thumbnail} alt={`Repost ${index + 1}`} />
                  )}
                  {repost.author && (
                    <div className="repost-author">
                      <span>@{repost.author.username}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-reposts">
                <p>No reposts yet</p>
              </div>
            )}
          </div>
        )}

        {/* Bio Tab */}
        {activeTab === 'bio' && (
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
          // Always use candidate's real cpPoints from API
          const cpPoints = candidate.cpPoints || 0
          const raceChange = candidate.change || '+0.00'
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
                      <span>Top {tierPercentile}% of users</span>
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

                // Format period change for display
                const formatPeriodChange = () => {
                  const prefix = periodChange >= 0 ? '+' : ''
                  return `${prefix}${periodChange.toFixed(2)}`
                }

                return (
                  <div className="chart-area">
                    <svg className="chart-svg" viewBox="0 0 340 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradientGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)"/>
                          <stop offset="100%" stopColor="rgba(16, 185, 129, 0)"/>
                        </linearGradient>
                        <linearGradient id="chartGradientRed" x1="0" y1="0" x2="0" y2="1">
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
                            <path className={`chart-area-fill ${isNegativeChange ? 'negative' : 'positive'}`} d={areaPath}/>
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

        {/* Race Pills - only show if candidate is in 2+ races */}
        {candidate.races && candidate.races.length > 1 && (
          <div className="tag-pills-container">
            <div className="tag-pills">
              {candidate.races.map((race) => (
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

        {/* Nominations List */}
        <div className="nominations-list">
          {/* CP Verified Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section">
              <div className="nomination-divider"></div>
              <div className="cp-badge">
                <div className="cp-badge-circle">
                  <span className="cp-badge-c">C</span>
                  <span className="cp-badge-p">P</span>
                </div>
              </div>
            </div>
            <span className="cp-section-label verified">VERIFIED REVIEWS</span>
          </div>

          {/* No Reviews State - show when no real reviews exist */}
          {(isStarter || communityReviews.length === 0) ? (
            <p className="starter-no-reviews">{candidate.reviewsCount || 0} reviews yet</p>
          ) : (
            <>
              {/* Rating Badge */}
              <div className="chart-rating-badge below-verified">
                <span className="rating-value">{candidate.averageRating?.toFixed(1) || '0.0'}</span>
                <div className="rating-star-circle">
                  <svg className="rating-star" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              </div>

              {/* Reviews - from API */}
              {(showAllVerifiedReviews ? communityReviews : communityReviews.slice(0, 3)).map((nomination, index) => (
            <div key={nomination.id} className="nomination-item paid">
              <div className="nomination-header">
                <div className="nomination-user">
                  <div
                    className="nomination-avatar-ring clickable"
                    style={{ borderColor: getPartyColor(nomination.user.party) }}
                    onClick={(e) => { e.stopPropagation(); onUserClick?.(nomination.user); }}
                  >
                    <img
                      src={nomination.user.avatar}
                      alt={nomination.user.username}
                      className="nomination-avatar"
                    />
                  </div>
                  <span className="nomination-username clickable" onClick={(e) => { e.stopPropagation(); onUserClick?.(nomination.user); }}>{nomination.user.username}</span>
                  <span className="cp-verified-badge">✓</span>
                </div>
                <span className="nomination-time">{nomination.timestamp}</span>
              </div>

              {nomination.text && (
                <p className="nomination-text">{nomination.text}</p>
              )}

              {nomination.media ? (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                  <div className="nomination-rating overlay">
                    {renderStars(nomination.rating)}
                  </div>
                </div>
              ) : (
                <div className="nomination-rating">
                  {renderStars(nomination.rating)}
                </div>
              )}
            </div>
          ))}

              {/* Load More / Load Less Verified Reviews */}
              {communityReviews.length > 3 && (
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

              {/* Leave a Verified Review link - below paid nominations, if local */}
              {isLocalToCandidate && (
                <button className="leave-review-link verified" onClick={() => setShowPaywall(true)}>Leave a Verified Review</button>
              )}

              {/* Community Reviews Section Header */}
              <div className="cp-section-header">
                <div className="cp-divider-section community">
                  <div className="nomination-divider community"></div>
                </div>
                <span className="cp-section-label community">Community Reviews</span>
              </div>

              {/* Regular Nominations */}
              {communityReviews.map((nomination, index) => (
            <div
              key={nomination.id}
              className="nomination-item clickable"
              onClick={() => setRespondingTo(nomination)}
            >
              <div className="nomination-header">
                <div className="nomination-user">
                  <div
                    className="nomination-avatar-ring clickable"
                    style={{ borderColor: getPartyColor(nomination.user.party) }}
                    onClick={(e) => { e.stopPropagation(); onUserClick?.(nomination.user); }}
                  >
                    <img
                      src={nomination.user.avatar}
                      alt={nomination.user.username}
                      className="nomination-avatar"
                    />
                  </div>
                  <span className="nomination-username clickable" onClick={(e) => { e.stopPropagation(); onUserClick?.(nomination.user); }}>{nomination.user.username}</span>
                </div>
                <span className="nomination-time">{nomination.timestamp}</span>
              </div>

              {nomination.text && (
                <p className="nomination-text">{nomination.text}</p>
              )}

              {nomination.media ? (
                <div className="nomination-media">
                  <img src={nomination.media} alt="Nomination media" />
                  <div className="nomination-rating overlay">
                    {renderStars(nomination.rating)}
                  </div>
                </div>
              ) : (
                <div className="nomination-rating">
                  {renderStars(nomination.rating)}
                </div>
              )}

              {/* Display response if exists */}
              {reviewResponses[nomination.id] && (
                <>
                  <div className="nomination-response">
                    <div className="response-header">
                      <img src={candidate.avatar} alt={candidate.username} className="response-avatar" />
                      <span className="response-author">{candidate.username}</span>
                    </div>
                    <p className="response-text">{reviewResponses[nomination.id]}</p>
                  </div>
                  <button className="more-comments-btn" onClick={(e) => e.stopPropagation()}>
                    load more
                  </button>
                </>
              )}
            </div>
          ))}
            </>
          )}

        </div>

        {/* Leave a Review - only show if not starter */}
        {!isStarter && <p className="leave-review-text" onClick={() => setShowReviewModal(true)} style={{ cursor: 'pointer' }}>Leave a Review</p>}

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

        {/* Profile Sections */}
        <div className="profile-sections">
          <div className="profile-sections-header">
            <span className="profile-sections-title">Icebreakers</span>
          </div>

          {/* Render icebreakers in drag-and-drop order */}
          {getOrderedIcebreakers().map((icebreaker) => {
            const isDragOver = dragOverItem === icebreaker.id

            if (icebreaker.type === 'written') {
              return (
                <div
                  key={icebreaker.id}
                  className={`profile-section ${isDragOver ? `drag-over ${dropPosition === 'above' ? 'drop-above' : 'drop-below'}` : ''}`}
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
                  className={`profile-section ${isDragOver ? `drag-over ${dropPosition === 'above' ? 'drop-above' : 'drop-below'}` : ''}`}
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
                  className={`profile-section ${isDragOver ? `drag-over ${dropPosition === 'above' ? 'drop-above' : 'drop-below'}` : ''}`}
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
                  <span className="section-title">{icebreaker.data.title}</span>
                  <div className="energize-tags">
                    {icebreaker.data.tags.map((tag) => (
                      <span key={tag} className="energize-tag">{tag}</span>
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
                  className={`profile-section ${isDragOver ? `drag-over ${dropPosition === 'above' ? 'drop-above' : 'drop-below'}` : ''}`}
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
                  <span className="section-title guess">{icebreaker.data.title}</span>
                  <div className="guess-options">
                    {icebreaker.data.options.map((option, index) => (
                      <button
                        key={index}
                        className={`guess-bubble ${getGuessClass(index)}`}
                        onClick={() => handleGuess(index)}
                        disabled={guessState.transitioning || guessState.revealed}
                      >
                        <span className="guess-text">{option}</span>
                        {guessState.selected === index && guessState.transitioning && (
                          <span className="guess-icon">
                            {index === profileSections.guessWhichTrue.correctIndex ? '✓' : '✕'}
                          </span>
                        )}
                      </button>
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

          {/* Add Icebreakers Button - for starter profiles */}
          {isStarter && (
            <button className="starter-add-icebreakers" onClick={() => {
              setEditInitialSection('icebreakers')
              setShowEditBio(true)
            }}>
              add icebreakers
            </button>
          )}

          {/* Recent Post - only show if not starter and recentPost exists */}
          {!isStarter && profileSections.recentPost && (
          <div className="profile-section post">
            <div className="post-header">
              <span className="post-username">{profileSections.recentPost.username}</span>
              <span className="post-timestamp">{profileSections.recentPost.timestamp}</span>
            </div>
            <div className="post-media">
              <img src={profileSections.recentPost.media} alt="Post media" />
              <button className="post-nav-btn">›</button>
            </div>
          </div>
          )}
        </div>
          </>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="activity-feed">
            {/* Show real user activity only - no mock data */}
            {userActivity.length > 0 ? userActivity.map((activity) => {
              const config = activityConfig[activity.type]
              const video = activity.video
              const actor = activity.actor || { username: 'Someone', avatar: null }
              const videoPartyColor = getPartyColor(video?.user?.party || 'Independent')
              const hasVideoUrl = !!video?.videoUrl
              const hasVideo = !!video
              return (
                <div key={activity.id} className="activity-item">
                  {/* Action indicator at top - full width */}
                  <div className="activity-action-badge">
                    <img
                      src={actor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.username)}&background=random`}
                      alt={actor.username}
                      className="activity-action-badge-avatar"
                    />
                    <span className="activity-action-user">{actor.username}</span>
                    <span className="activity-action-text">{activity.action}</span>
                    <span className="activity-timestamp">{activity.timestamp}</span>
                  </div>

                  {/* Video card - only show if we have video data */}
                  {hasVideo && (
                    <div className="activity-video-card">
                      {/* Video container */}
                      <div className="activity-video-container">
                        {hasVideoUrl ? (
                          <video
                            src={video.videoUrl}
                            className={`activity-video-thumbnail ${video?.isMirrored ? 'mirrored' : ''}`}
                            loop
                            muted
                            playsInline
                            autoPlay
                          />
                        ) : video?.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt=""
                            className="activity-video-thumbnail"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop'
                            }}
                          />
                        ) : (
                          <div className="activity-video-thumbnail activity-video-placeholder" />
                        )}

                        {/* Overlay content */}
                        <div className="activity-video-overlay">
                          <div className="activity-info">
                            {video?.race && (
                              <div className="activity-race-pill">
                                <span className="activity-race-dot"></span>
                                {video.race}
                              </div>
                            )}
                            <div className="activity-user-row">
                              <img
                                src={video?.user?.avatar}
                                alt={video?.user?.username}
                                className="activity-user-avatar"
                                style={{ borderColor: videoPartyColor }}
                              />
                              <div className="activity-user-details">
                                <span className="activity-party-tag">{video?.user?.party || 'Independent'}</span>
                                <span className="activity-username">@{video?.user?.username}</span>
                              </div>
                            </div>
                            <p className="activity-caption">{video?.caption}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }) : (
              <div className="empty-activity">
                <p>No activity yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Overlay - rendered via portal to avoid transform stacking context issues */}
      {showEditBio && createPortal(
        <div className="edit-bio-overlay-portal">
          <EditProfile
            key={editInitialSection || 'main'}
            candidate={candidate}
            profileSections={profileSections}
            onSave={(updatedData) => {
              setProfileSections(prev => {
                const newSections = { ...prev }

                // Handle custom icebreakers
                if (updatedData.customWritten !== undefined) {
                  newSections.customWritten = updatedData.customWritten
                }
                if (updatedData.customSliders !== undefined) {
                  newSections.customSliders = updatedData.customSliders
                }

                // Handle tags
                if (updatedData.topicsThatEnergize !== undefined) {
                  newSections.topicsThatEnergize = {
                    ...prev.topicsThatEnergize,
                    tags: updatedData.topicsThatEnergize
                  }
                }

                // Handle guess game
                if (updatedData.guessWhichTrue !== undefined) {
                  newSections.guessWhichTrue = {
                    ...prev.guessWhichTrue,
                    options: updatedData.guessWhichTrue.options,
                    correctIndex: updatedData.guessWhichTrue.correctIndex
                  }
                }

                return newSections
              })
            }}
            onClose={() => {
              setShowEditBio(false)
              setEditInitialSection(null)
            }}
            initialSection={editInitialSection}
            onOptOut={onOptOut}
          />
        </div>,
        document.body
      )}

      {/* Simple Bio Text Edit Modal */}
      {showBioTextEdit && createPortal(
        <div className="bio-edit-overlay">
          <div className="bio-edit-modal">
            <div className="bio-edit-header">
              <button className="bio-edit-cancel" onClick={() => {
                setBioText(passedCandidate?.bio || '')
                setShowBioTextEdit(false)
              }}>
                Cancel
              </button>
              <h3>Edit Bio</h3>
              <button
                className="bio-edit-save"
                onClick={() => {
                  onBioChange?.(bioText)
                  setShowBioTextEdit(false)
                }}
              >
                Save
              </button>
            </div>
            <div className="bio-edit-content">
              <textarea
                className="bio-edit-textarea"
                placeholder="Write a short bio..."
                value={bioText}
                onChange={(e) => {
                  if (e.target.value.length <= 150) {
                    setBioText(e.target.value)
                  }
                }}
                maxLength={150}
                autoFocus
              />
              <div className="bio-edit-counter">
                <span className={bioText.length >= 150 ? 'at-limit' : ''}>
                  {bioText.length}/150
                </span>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
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


      {/* Report Modal */}
      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3>Report {candidate.username}</h3>
              <button className="report-modal-close" onClick={() => setShowReportModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="report-modal-options">
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Spam</span>
              </button>
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Harassment</span>
              </button>
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Hate Speech</span>
              </button>
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Misinformation</span>
              </button>
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Impersonation</span>
              </button>
              <button className="report-option" onClick={() => setShowReportModal(false)}>
                <span>Other</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Post View - rendered via portal to escape transformed parent */}
      {showSinglePost && createPortal(
        <SinglePostView
          posts={allPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setShowSinglePost(false)}
          onEndReached={() => setShowSinglePost(false)}
          onPartyClick={onPartyClick}
          onUsernameClick={onUserClick}
          onOpenComments={(post) => onOpenComments?.(post, handlePostCommentAdded)}
          onLikeChange={handlePostLikeChange}
          profileName={candidate.username}
        />,
        document.getElementById('modal-root') || document.body
      )}

      {/* Following Modal */}
      {showFollowingModal && createPortal(
        <div className="stat-modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Following</h3>
              <button className="stat-modal-close" onClick={() => setShowFollowingModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {isLoadingFollowing ? (
                <div className="stat-modal-loading">Loading...</div>
              ) : followingState.length === 0 ? (
                <div className="stat-modal-empty">Not following anyone yet</div>
              ) : (
                followingState.map((user) => (
                  <div
                    key={user.id}
                    className="stat-modal-row clickable"
                    onClick={() => { setShowFollowingModal(false); onUserClick?.(user); }}
                  >
                    <div className="stat-row-user">
                      <div className="stat-row-avatar-ring" style={{ borderColor: getPartyColor(user.party) }}>
                        <img src={user.avatar} alt={user.username} className="stat-row-avatar" />
                      </div>
                      <div className="stat-row-info">
                        <span className="stat-row-username">{user.username}</span>
                        <span className="stat-row-meta">{user.party || 'Independent'}</span>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Followers Modal */}
      {showFollowersModal && createPortal(
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
              {isLoadingFollowers ? (
                <div className="stat-modal-loading">Loading...</div>
              ) : followersState.length === 0 ? (
                <div className="stat-modal-empty">No followers yet</div>
              ) : (
                followersState.map((follower) => (
                  <div key={follower.id} className="stat-modal-row">
                    <div
                      className="stat-row-user clickable"
                      onClick={() => { setShowFollowersModal(false); onUserClick?.(follower); }}
                    >
                      <div className="stat-row-avatar-ring" style={{ borderColor: getPartyColor(follower.party) }}>
                        <img src={follower.avatar} alt={follower.username} className="stat-row-avatar" />
                      </div>
                      <span className="stat-row-username">{follower.username}</span>
                    </div>
                    <button
                      className={`stat-row-follow-btn ${follower.isFollowing ? 'following' : ''}`}
                      onClick={async () => {
                        const wasFollowing = follower.isFollowing
                        // Optimistic update
                        setFollowersState(prev => prev.map(f =>
                          f.id === follower.id ? { ...f, isFollowing: !f.isFollowing } : f
                        ))
                        try {
                          if (wasFollowing) {
                            await usersApi.unfollowUser(follower.id)
                          } else {
                            await usersApi.followUser(follower.id)
                          }
                        } catch (error) {
                          // Revert on error
                          setFollowersState(prev => prev.map(f =>
                            f.id === follower.id ? { ...f, isFollowing: wasFollowing } : f
                          ))
                        }
                      }}
                    >
                      {follower.isFollowing ? 'following' : 'follow'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Races Modal */}
      {showRacesModal && createPortal(
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
              {/* Won Races - at the top, green */}
              {(candidate.racesWon || []).map((race) => (
                <div key={race.id} className="stat-modal-row race-row won">
                  <div className="race-row-info">
                    <div className="race-row-indicator won"></div>
                    <span className="race-row-name">{race.title || race.name}</span>
                  </div>
                  <span className="race-row-position won">Winner</span>
                </div>
              ))}

              {/* Competing Races */}
              {(candidate.racesCompeting || []).map((race) => (
                <div
                  key={race.id}
                  className="stat-modal-row race-row clickable"
                  onClick={() => { setShowRacesModal(false); /* TODO: navigate to race */ }}
                >
                  <div className="race-row-info">
                    <div className="race-row-indicator competing"></div>
                    <span className="race-row-name">{race.title || race.name}</span>
                  </div>
                  <div className="race-row-stats">
                    {race.points > 0 && <span className="race-row-points">{race.points} pts</span>}
                    {race.tier && <span className="race-row-tier">{race.tier}</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              ))}

              {/* Following Races - only for own profile */}
              {isOwnProfile && (candidate.racesFollowing || []).length > 0 && (
                <>
                  <div className="race-section-divider">
                    <span>Following</span>
                  </div>
                  {(candidate.racesFollowing || []).map((race) => (
                    <div
                      key={race.id}
                      className="stat-modal-row race-row clickable"
                      onClick={() => { setShowRacesModal(false); /* TODO: navigate to race */ }}
                    >
                      <div className="race-row-info">
                        <div className="race-row-indicator following"></div>
                        <span className="race-row-name">{race.title || race.name}</span>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  ))}
                </>
              )}

              {/* Empty state */}
              {(candidate.racesWon || []).length === 0 &&
               (candidate.racesCompeting || []).length === 0 &&
               (!isOwnProfile || (candidate.racesFollowing || []).length === 0) && (
                <div className="stat-modal-empty">No races yet</div>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="paywall-overlay" onClick={() => setShowPaywall(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>
            <div className="paywall-icon">🔒</div>
            <h3 className="paywall-title">Verified Reviews</h3>
            <p className="paywall-text">
              Leaving verified reviews is a premium feature. Upgrade to share your verified experience with this candidate.
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
                    id: `nom-${Date.now()}`,
                    user: {
                      username: 'You',
                      avatar: 'https://i.pravatar.cc/40?img=68',
                      party: null,
                    },
                    text: reviewText,
                    rating: reviewRating,
                    timestamp: 'Just now',
                    media: null,
                    isPaid: false,
                  }
                  setCommunityReviews([newReview, ...communityReviews])
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Profile</h3>
              <button className="share-modal-close" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            <div className="share-modal-options">
              <button className="share-option" onClick={() => {
                navigator.clipboard.writeText(`https://coolpeople.com/@${candidate.username}`)
                setShowShareModal(false)
                setShowCopiedToast(true)
                setTimeout(() => setShowCopiedToast(false), 2000)
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Copy Link</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Send Message</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Share to Story</span>
              </button>
              <button className="share-option">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>More Options</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="copied-toast">Link copied!</div>
      )}
    </div>
  )
}

export default CandidateProfile
