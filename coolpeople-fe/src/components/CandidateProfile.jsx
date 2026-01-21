import { useState, useMemo, useEffect, useRef } from 'react'
import '../styling/CandidateProfile.css'
import Sparkline from './Sparkline'
import { getPartyColor, generateSparklineData } from '../data/mockData'
import EditProfile from './EditProfile'
import SinglePostView from './SinglePostView'

// Mock data for the candidate profile
const mockCandidate = {
  id: 'user-1',
  username: 'William.Hiya',
  avatar: 'https://i.pravatar.cc/150?img=12',
  party: 'The Pink Lady Party',
  nominations: '9,999',
  followers: '1M',
  change: '+301.26',
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

const mockTags = ['all', 'trans', 'police', 'honesty', 'generosity', 'humour']

// Sparkline data for each tag category
const tagSparklineData = {
  all: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
  trans: [30, 35, 32, 40, 45, 42, 50, 55, 52, 60, 58, 62, 65, 68, 70, 72, 75, 78, 80, 85],
  police: [60, 55, 58, 52, 48, 50, 45, 48, 42, 40, 38, 42, 45, 48, 50, 52, 55, 58, 60, 62],
  honesty: [70, 72, 75, 78, 80, 82, 85, 83, 80, 78, 82, 85, 88, 90, 92, 94, 96, 95, 93, 95],
  generosity: [50, 52, 55, 58, 60, 58, 55, 52, 50, 55, 60, 65, 70, 75, 80, 78, 75, 72, 70, 68],
  humour: [40, 45, 50, 55, 60, 65, 70, 68, 72, 75, 78, 80, 75, 70, 72, 78, 82, 85, 88, 92],
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
]

// Initial profile content sections data
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
      user: { username: 'politico.daily', avatar: 'https://i.pravatar.cc/40?img=33', party: 'Independent' },
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
      user: { username: 'foodie.voter', avatar: 'https://i.pravatar.cc/40?img=36', party: 'Independent' },
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
      party: 'Independent',
    },
    text: 'Great leader with a clear vision for our community',
    rating: 4,
    timestamp: '3 days ago',
    media: null,
    isPaid: false,
    tag: 'honesty',
  },
]

function CandidateProfile({ candidate: passedCandidate, onClose, onPartyClick, onUserClick, onOpenComments }) {
  // Merge passed candidate with defaults for missing properties
  const candidate = { ...mockCandidate, ...passedCandidate }

  const profileRef = useRef(null)

  // Scroll to top when candidate changes
  useEffect(() => {
    if (profileRef.current) {
      profileRef.current.scrollTo(0, 0)
    }
  }, [passedCandidate?.username])

  const [activeTab, setActiveTab] = useState('bio')
  const [selectedTags, setSelectedTags] = useState(['all']) // array of active tag names
  const [isFollowing, setIsFollowing] = useState(candidate.isFollowing)
  const [isFavorited, setIsFavorited] = useState(candidate.isFavorited)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditBio, setShowEditBio] = useState(false)
  const [profileSections, setProfileSections] = useState(initialProfileSections)
  const [isLocalToCandidate] = useState(true) // TODO: determine from user/candidate location
  const [guessState, setGuessState] = useState({
    selected: null,
    transitioning: false,
    revealed: false // Once true, correct answer stays green forever
  })
  const [respondingTo, setRespondingTo] = useState(null) // nomination being responded to
  const [responseText, setResponseText] = useState('')
  const [reviewResponses, setReviewResponses] = useState({}) // { nominationId: responseText }
  const [showSinglePost, setShowSinglePost] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)

  // Convert posts to reel format for SinglePostView with variable engagement scores
  const trends = ['up', 'down', 'stable']
  const mockRaces = ['NYC Mayor 2024', 'City Council District 5', 'State Assembly']
  const defaultPostsAsReels = (candidate.postImages || []).map((img, i) => ({
    id: `candidate-post-${i}`,
    thumbnail: img,
    user: {
      username: candidate.username,
      avatar: candidate.avatar,
      party: candidate.party,
    },
    title: '',
    caption: '',
    targetRace: mockRaces[i % mockRaces.length],
    stats: { votes: '0', likes: '0', comments: '0', shazam: '0', shares: '0' },
    engagementScores: [
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
  }))

  // Combine dynamic posts with default posts
  const allPosts = candidate.posts
    ? [...candidate.posts, ...defaultPostsAsReels]
    : defaultPostsAsReels

  // Handle post click to open SinglePostView
  const handlePostClick = (index) => {
    setSelectedPostIndex(index)
    setShowSinglePost(true)
  }
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
    buildIcebreakersArray(initialProfileSections).map(item => item.id)
  )

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

    // Remove dragged item and insert at target position
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setIcebreakersOrder(newOrder)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Chart colors cycle (for filtered chart based on tag count)
  const chartColors = [
    '#0EFB49', // green (default/all only)
    '#00F2EA', // teal
    '#FF2A55', // pink
    '#FFD700', // gold
    '#9B59B6', // purple
  ]

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

  // Handle tag click - toggle on/off
  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // Remove tag
        const newTags = prev.filter(t => t !== tag)
        // If nothing selected, default back to 'all'
        return newTags.length === 0 ? ['all'] : newTags
      } else {
        // Add tag
        return [...prev, tag]
      }
    })
  }

  // Get chart color based on selected tags
  const getChartColor = () => {
    // If only 'all' is selected, return green
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return '#0EFB49' // green
    }
    // Count tags excluding 'all'
    const tagCount = selectedTags.filter(t => t !== 'all').length
    // Cycle through colors, cap at last color
    const colorIndex = Math.min(tagCount, chartColors.length - 1)
    return chartColors[colorIndex]
  }

  const chartColor = getChartColor()

  // Get filtered sparkline data based on selected tags
  const getFilteredSparklineData = () => {
    // If only 'all' is selected, return overall data
    if (selectedTags.length === 1 && selectedTags[0] === 'all') {
      return tagSparklineData.all
    }
    // Get tags excluding 'all'
    const activeTags = selectedTags.filter(t => t !== 'all')
    if (activeTags.length === 0) return tagSparklineData.all

    // If one tag, return its data
    if (activeTags.length === 1) {
      return tagSparklineData[activeTags[0]] || tagSparklineData.all
    }

    // Multiple tags: average the data points
    const dataLength = tagSparklineData.all.length
    const averaged = []
    for (let i = 0; i < dataLength; i++) {
      const sum = activeTags.reduce((acc, tag) => {
        return acc + (tagSparklineData[tag]?.[i] || 0)
      }, 0)
      averaged.push(Math.round(sum / activeTags.length))
    }
    return averaged
  }

  const filteredSparklineData = getFilteredSparklineData()

  // Calculate badge positions based on sparkline data
  const getBadgePositions = (data) => {
    if (!data || data.length < 2) return { ratingTop: 10, changeTop: 45 }

    const chartHeight = 84
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Get the last value (where the line ends)
    const lastValue = data[data.length - 1]

    // Calculate Y position of the end point (inverted because SVG y=0 is top)
    const endY = chartHeight - ((lastValue - min) / range) * chartHeight

    // Position rating badge slightly below the end point, but not too low
    const ratingTop = Math.max(5, Math.min(endY + 5, 40))

    // Position change indicator below rating, but above baseline (baseline is ~50% = 42px)
    const changeTop = Math.min(ratingTop + 30, 55)

    return { ratingTop, changeTop }
  }

  const badgePositions = getBadgePositions(filteredSparklineData)

  // Calculate change value from sparkline data
  const getChangeValue = (data) => {
    if (!data || data.length < 2) return '+0.00'
    const first = data[0]
    const last = data[data.length - 1]
    const change = ((last - first) / first) * 100
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)
  }

  const filteredChange = getChangeValue(filteredSparklineData)

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
        {/* Dev edit button */}
        <button
          className="dev-edit-btn"
          onClick={() => setShowEditBio(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

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
              <img src={candidate.avatar} alt={candidate.username} className="profile-avatar" />
            </div>
            <div className="profile-info">
              <h2 className="profile-username">{candidate.username}</h2>
              <button
                className="profile-party-btn"
                onClick={() => onPartyClick?.(candidate.party)}
              >
                {candidate.party}
              </button>
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-stats-grid">
              <div className="stat-item">
                <span className="stat-number">{candidate.nominations}</span>
                <span className="stat-label">Nominations</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.races || '8'}</span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {candidate.ranking || '.3%'}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>
            <p className="profile-bio">{candidate.bio || 'Running for Mayor. Building a better tomorrow for our community. '}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button className="profile-action-btn messages">messages</button>
          <button className="profile-action-btn nominate">nominate</button>
          <button
            className={`profile-action-btn follow ${isFollowing ? 'following' : ''}`}
            onClick={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? 'following' : 'follow'}
          </button>
        </div>

        {/* Tabs */}
        <div className={`profile-tabs ${activeTab === 'posts' || activeTab === 'details' ? 'posts-active' : ''}`}>
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
      <div className={`profile-content ${activeTab === 'posts' || activeTab === 'details' ? 'posts-active' : ''}`}>
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

        {/* Filtered Chart - Full Width */}
        <div className="chart-container full-width">
          <div className="chart-wrapper">
            <Sparkline
              data={filteredSparklineData}
              color={chartColor}
              width={340}
              height={84}
              strokeWidth={2}
              showBaseline={true}
            />
            <div className="chart-rating-badge" style={{ top: `${badgePositions.ratingTop}px` }}>
              <span className="rating-value">3.2</span>
              <div className="rating-star-circle">
                <svg className="rating-star" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
            <div className="chart-change-indicator" style={{ top: `${badgePositions.changeTop}px` }}>
              <span
                className="chart-change"
                style={{ background: '#42FF87' }}
              >
                {filteredChange}
              </span>
            </div>
          </div>
        </div>

        {/* Tag Pills */}
        <div className="tag-pills-container">
          <div className="tag-pills">
            {mockTags.map((tag) => {
              const isActive = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  className={`tag-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

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
            <span className="cp-section-label verified">Verified Reviews</span>
          </div>

          {/* Paid Nominations */}
          {paidNominations.map((nomination, index) => (
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

          {/* Leave a Verified Review link - below paid nominations, if local */}
          {isLocalToCandidate && (
            <button className="leave-review-link verified">Leave a Verified Review</button>
          )}

          {/* Community Reviews Section Header */}
          <div className="cp-section-header">
            <div className="cp-divider-section community">
              <div className="nomination-divider community"></div>
            </div>
            <span className="cp-section-label community">Community Reviews</span>
          </div>

          {/* Regular Nominations */}
          {regularNominations.map((nomination, index) => (
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

        </div>

        {/* Leave a Review */}
        <p className="leave-review-text">Leave a Review</p>

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

          {/* Recent Post */}
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
        </div>
          </>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="activity-feed">
            {activityFeed.map((activity) => {
              const config = activityConfig[activity.type]
              const video = activity.video
              const videoPartyColor = getPartyColor(video.user.party)
              return (
                <div key={activity.id} className="activity-item">
                  {/* Action indicator at top - full width */}
                  <div className="activity-action-badge">
                    <span className="activity-action-icon" style={{ color: config.color }}>{config.icon}</span>
                    <span className="activity-action-text">
                      {activity.type === 'repost' || activity.type === 'post' ? 'post by' : activity.action}
                    </span>
                    <span className="activity-action-user">{video.user.username}</span>
                    <span className="activity-timestamp">{activity.timestamp}</span>
                  </div>

                  {/* Video card */}
                  <div className="activity-video-card">

                  {/* Video container */}
                  <div className="activity-video-container">
                    <img src={video.thumbnail} alt="" className="activity-video-thumbnail" />

                    {/* Overlay content */}
                    <div className="activity-video-overlay">
                      <div className="activity-info">
                        {video.race && (
                          <div className="activity-race-pill">
                            <span className="activity-race-dot"></span>
                            {video.race}
                          </div>
                        )}
                        <div className="activity-user-row">
                          <img
                            src={video.user.avatar}
                            alt={video.user.username}
                            className="activity-user-avatar"
                            style={{ borderColor: videoPartyColor }}
                          />
                          <div className="activity-user-details">
                            <span className="activity-party-tag">{video.user.party}</span>
                            <span className="activity-username">@{video.user.username}</span>
                          </div>
                        </div>
                        <p className="activity-caption">{video.caption}</p>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Profile Overlay */}
      {showEditBio && (
        <div className="edit-bio-overlay">
          <EditProfile
            candidate={candidate}
            profileSections={profileSections}
            onSave={(updatedData) => {
              setProfileSections(prev => {
                const newSections = { ...prev }

                // Handle custom icebreakers
                if (updatedData.customWritten) {
                  newSections.customWritten = updatedData.customWritten
                }
                if (updatedData.customSliders) {
                  newSections.customSliders = updatedData.customSliders
                }

                // Handle tags
                if (updatedData.topicsThatEnergize?.length > 0) {
                  newSections.topicsThatEnergize = { ...prev.topicsThatEnergize, tags: updatedData.topicsThatEnergize }
                }

                // Handle guess game
                if (updatedData.guessWhichTrue?.options?.some(o => o?.trim())) {
                  newSections.guessWhichTrue = {
                    ...prev.guessWhichTrue,
                    options: updatedData.guessWhichTrue.options,
                    correctIndex: updatedData.guessWhichTrue.correctIndex
                  }
                }

                return newSections
              })
            }}
            onClose={() => setShowEditBio(false)}
          />
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

      {/* Single Post View */}
      {showSinglePost && (
        <SinglePostView
          posts={allPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setShowSinglePost(false)}
          onEndReached={() => setShowSinglePost(false)}
          onPartyClick={onPartyClick}
          onUsernameClick={onUserClick}
          onOpenComments={onOpenComments}
          profileName={candidate.username}
        />
      )}
    </div>
  )
}

export default CandidateProfile
