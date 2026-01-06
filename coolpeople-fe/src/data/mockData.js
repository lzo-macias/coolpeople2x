// Mock data for CoolPeople app
// This will be replaced with real API calls to backend

// Party colors - each party has a unique color used for user borders app-wide
export const PARTY_COLORS = {
  'Democrat': '#0015BC',
  'Republican': '#E81B23',
  'Independent': '#808080',
  'Green': '#17AA5C',
  'Libertarian': '#FED105',
  'The Pink Lady Party': '#e91e8c',
  'Progressive': '#9333ea',
}

// Helper to get party color
export const getPartyColor = (party) => PARTY_COLORS[party] || '#00d4d4'

// Helper to generate sparkline data (jagged stock chart pattern)
const generateSparklineData = (trend = 'up', points = 20) => {
  const data = []
  let value = 50 + Math.random() * 20
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * 15
    const trendBias = trend === 'up' ? 0.5 : trend === 'down' ? -0.5 : 0
    value = Math.max(10, Math.min(90, value + change + trendBias))
    data.push(value)
  }
  return data
}

// Users / Candidates
export const mockUsers = [
  {
    id: 'user-1',
    username: 'Lzo.macias.formayor',
    displayName: 'Lzo Macias',
    avatar: 'https://i.pravatar.cc/100?img=1',
    party: 'Democrat',
    socialCredit: 8750,
    isVerified: true,
  },
  {
    id: 'user-2',
    username: 'William.H.ForMayor',
    displayName: 'William Harrison',
    avatar: 'https://i.pravatar.cc/100?img=12',
    party: 'Democrat',
    socialCredit: 9200,
    isVerified: true,
  },
  {
    id: 'user-3',
    username: 'Sarah.J.Council',
    displayName: 'Sarah Johnson',
    avatar: 'https://i.pravatar.cc/100?img=5',
    party: 'Republican',
    socialCredit: 7800,
    isVerified: true,
  },
  {
    id: 'user-4',
    username: 'Mike.T.District4',
    displayName: 'Mike Thompson',
    avatar: 'https://i.pravatar.cc/100?img=8',
    party: 'Independent',
    socialCredit: 6500,
    isVerified: false,
  },
  {
    id: 'user-5',
    username: 'Alex.M.Progressive',
    displayName: 'Alex Martinez',
    avatar: 'https://i.pravatar.cc/100?img=3',
    party: 'Democrat',
    socialCredit: 9500,
    isVerified: true,
  },
]

// Engagement scores for sparklines (shown at top of reels)
export const mockEngagementScores = [
  {
    id: 'eng-1',
    userId: 'user-1',
    username: 'Lzo.macias.formayor',
    avatar: 'https://i.pravatar.cc/40?img=1',
    party: 'Democrat',
    sparklineData: generateSparklineData('up'),
    recentChange: '+1',
    trend: 'up',
  },
  {
    id: 'eng-2',
    userId: 'user-2',
    username: 'Lzo.macias.formayor',
    avatar: 'https://i.pravatar.cc/40?img=12',
    party: 'Democrat',
    sparklineData: generateSparklineData('down'),
    recentChange: null,
    trend: 'down',
  },
  {
    id: 'eng-3',
    userId: 'user-3',
    username: 'Lzo.macias.formayor',
    avatar: 'https://i.pravatar.cc/40?img=5',
    party: 'Republican',
    sparklineData: generateSparklineData('stable'),
    recentChange: null,
    trend: 'stable',
  },
]

// Reels data
export const mockReels = [
  {
    id: 'reel-1',
    videoUrl: null, // Will be video URL when backend ready
    thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
    user: {
      id: 'user-2',
      username: 'William.H.ForMayor',
      displayName: 'William Harrison',
      party: 'Democrat',
      avatar: 'https://i.pravatar.cc/40?img=12',
    },
    title: 'THE BEST TEAM EVER GO TEAM TEAM',
    caption: 'Lorem ipsum dolor sit amet consectetur. Building a better tomorrow for our community! #CoolPeople #Vote2024',
    engagementScores: [
      {
        id: 'eng-1',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=1',
        party: 'Democrat',
        sparklineData: generateSparklineData('up'),
        recentChange: null,
        trend: 'up',
      },
      {
        id: 'eng-2',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=12',
        party: 'Democrat',
        sparklineData: generateSparklineData('down'),
        recentChange: '+1',
        trend: 'down',
      },
      {
        id: 'eng-3',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=5',
        party: 'Republican',
        sparklineData: generateSparklineData('stable'),
        recentChange: null,
        trend: 'stable',
      },
    ],
    stats: {
      votes: '9,999',
      likes: '9,999',
      comments: '9,999',
      shazam: '9,999',
      shares: '9,999',
    },
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'reel-2',
    videoUrl: null,
    thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=700&fit=crop',
    user: {
      id: 'user-3',
      username: 'Sarah.J.Council',
      displayName: 'Sarah Johnson',
      party: 'Republican',
      avatar: 'https://i.pravatar.cc/40?img=5',
    },
    title: 'Community First Initiative',
    caption: 'Working together to make our district stronger. Every voice matters in our democracy.',
    engagementScores: [
      {
        id: 'eng-4',
        username: 'Sarah.J.Council',
        avatar: 'https://i.pravatar.cc/40?img=5',
        party: 'Republican',
        sparklineData: generateSparklineData('up'),
        recentChange: '+2',
        trend: 'up',
      },
      {
        id: 'eng-5',
        username: 'Mike.T.District4',
        avatar: 'https://i.pravatar.cc/40?img=8',
        party: 'Independent',
        sparklineData: generateSparklineData('stable'),
        recentChange: null,
        trend: 'stable',
      },
      {
        id: 'eng-6',
        username: 'Lisa.K.Mayor',
        avatar: 'https://i.pravatar.cc/40?img=9',
        party: 'Democrat',
        sparklineData: generateSparklineData('down'),
        recentChange: null,
        trend: 'down',
      },
    ],
    stats: {
      votes: '5,432',
      likes: '8,765',
      comments: '1,234',
      shazam: '567',
      shares: '2,345',
    },
    createdAt: '2024-01-14T15:45:00Z',
  },
  {
    id: 'reel-3',
    videoUrl: null,
    thumbnail: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=700&fit=crop',
    user: {
      id: 'user-5',
      username: 'Alex.M.Progressive',
      displayName: 'Alex Martinez',
      party: 'Independent',
      avatar: 'https://i.pravatar.cc/40?img=3',
    },
    title: 'Progress for Everyone',
    caption: 'A new vision for inclusive politics. Join the movement and make your voice heard!',
    engagementScores: [
      {
        id: 'eng-7',
        username: 'Alex.M.Progressive',
        avatar: 'https://i.pravatar.cc/40?img=3',
        party: 'Green',
        sparklineData: generateSparklineData('up'),
        recentChange: '+5',
        trend: 'up',
      },
      {
        id: 'eng-8',
        username: 'Jordan.P.Green',
        avatar: 'https://i.pravatar.cc/40?img=7',
        party: 'Green',
        sparklineData: generateSparklineData('up'),
        recentChange: null,
        trend: 'up',
      },
      {
        id: 'eng-9',
        username: 'Casey.R.Future',
        avatar: 'https://i.pravatar.cc/40?img=4',
        party: 'Libertarian',
        sparklineData: generateSparklineData('stable'),
        recentChange: null,
        trend: 'stable',
      },
    ],
    stats: {
      votes: '12,345',
      likes: '15,678',
      comments: '3,456',
      shazam: '890',
      shares: '4,567',
    },
    createdAt: '2024-01-13T09:00:00Z',
  },
]

// Nomination stories (top of home page)
export const mockNominationStories = [
  { id: 'story-add', isAdd: true },
  { id: 'story-1', userId: 'user-1', name: 'Lzo Macias', image: 'https://i.pravatar.cc/100?img=1', hasNew: true, party: 'Democrat' },
  { id: 'story-2', userId: 'user-2', name: 'William H', image: 'https://i.pravatar.cc/100?img=12', hasNew: true, party: 'Democrat' },
  { id: 'story-3', userId: 'user-3', name: 'Sarah J', image: 'https://i.pravatar.cc/100?img=5', hasNew: false, party: 'Republican' },
  { id: 'story-4', userId: 'user-4', name: 'Mike T', image: 'https://i.pravatar.cc/100?img=8', hasNew: true, party: 'Independent' },
  { id: 'story-5', userId: 'user-5', name: 'Alex M', image: 'https://i.pravatar.cc/100?img=3', hasNew: false, party: 'Green' },
]

// Contacts for invite friends
export const mockContacts = [
  { id: 'contact-1', phone: '917-829-3866', image: 'https://i.pravatar.cc/80?img=10', name: 'John' },
  { id: 'contact-2', phone: '917-829-3866', image: 'https://i.pravatar.cc/80?img=11', name: 'Jane' },
  { id: 'contact-3', initial: 'A', phone: null, name: 'Alex' },
  { id: 'contact-4', phone: '917-829-3866', image: null, name: 'Unknown' },
  { id: 'contact-5', phone: '917-829-3866', image: null, name: 'Unknown' },
]

// Parties
export const mockParties = [
  { id: 'party-1', name: 'Democrat', color: '#0015BC', members: 15420 },
  { id: 'party-2', name: 'Republican', color: '#E81B23', members: 14280 },
  { id: 'party-3', name: 'Independent', color: '#808080', members: 8950 },
  { id: 'party-4', name: 'Green', color: '#17AA5C', members: 3200 },
  { id: 'party-5', name: 'Libertarian', color: '#FED105', members: 2100 },
]

// Scoreboard data
export const mockScoreboard = [
  {
    rank: 1,
    userId: 'user-1',
    username: 'Lzo.macias.formayor',
    avatar: 'https://i.pravatar.cc/60?img=1',
    party: 'The Pink Lady Party',
    score: 48134.89,
    change: 301.26,
    isFavorited: true,
    sparklineData: generateSparklineData('up', 15),
    chartData: [1.2, 1.4, 1.5, 1.8, 2.1, 2.3, 2.5, 2.7, 2.8, 3.0, 3.2],
  },
  {
    rank: 2,
    userId: 'user-2',
    username: 'mamasforpresident',
    avatar: 'https://i.pravatar.cc/60?img=12',
    party: 'The Pink Lady Party',
    score: 48134.89,
    change: -301.26,
    isFavorited: true,
    sparklineData: generateSparklineData('down', 15),
    chartData: [1.0, 1.2, 1.4, 1.6, 1.9, 2.1, 2.3, 2.4, 2.6, 2.8, 2.9],
  },
  {
    rank: 3,
    userId: 'user-3',
    username: 'lynnforroyalty',
    avatar: 'https://i.pravatar.cc/60?img=5',
    party: 'The Pink Lady Party',
    score: 48134.89,
    change: 301.26,
    isFavorited: true,
    sparklineData: generateSparklineData('up', 15),
    chartData: [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.7],
  },
  {
    rank: 4,
    userId: 'user-4',
    username: 'Sarah.J.Council',
    avatar: 'https://i.pravatar.cc/60?img=8',
    party: 'Republican',
    score: 35420.50,
    change: -120.45,
    isFavorited: false,
    sparklineData: generateSparklineData('down', 15),
    chartData: [0.9, 1.0, 1.2, 1.3, 1.5, 1.6, 1.8, 1.9, 2.1, 2.3, 2.5],
  },
  {
    rank: 5,
    userId: 'user-5',
    username: 'Alex.M.Progressive',
    avatar: 'https://i.pravatar.cc/60?img=3',
    party: 'Independent',
    score: 28750.00,
    change: 89.32,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
    chartData: [0.6, 0.8, 0.9, 1.1, 1.3, 1.4, 1.6, 1.7, 1.9, 2.1, 2.2],
  },
  {
    rank: 6,
    userId: 'user-6',
    username: 'Mike.T.District4',
    avatar: 'https://i.pravatar.cc/60?img=7',
    party: 'Democrat',
    score: 22100.75,
    change: 45.20,
    isFavorited: false,
    sparklineData: generateSparklineData('stable', 15),
    chartData: [0.4, 0.5, 0.6, 0.8, 0.9, 1.0, 1.2, 1.3, 1.5, 1.6, 1.8],
  },
  {
    rank: 7,
    userId: 'user-7',
    username: 'Jordan.P.Green',
    avatar: 'https://i.pravatar.cc/60?img=14',
    party: 'Green',
    score: 18500.00,
    change: 32.10,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
    chartData: [0.2, 0.3, 0.4, 0.5, 0.7, 0.8, 1.0, 1.1, 1.3, 1.4, 1.5],
  },
  {
    rank: 8,
    userId: 'user-8',
    username: 'Casey.R.Future',
    avatar: 'https://i.pravatar.cc/60?img=16',
    party: 'Libertarian',
    score: 15200.00,
    change: -15.50,
    isFavorited: false,
    sparklineData: generateSparklineData('down', 15),
    chartData: [0.3, 0.4, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
  },
  {
    rank: 9,
    userId: 'user-9',
    username: 'Taylor.M.Voice',
    avatar: 'https://i.pravatar.cc/60?img=18',
    party: 'Democrat',
    score: 12800.00,
    change: 22.30,
    isFavorited: false,
    sparklineData: generateSparklineData('stable', 15),
    chartData: [0.1, 0.2, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  },
  {
    rank: 10,
    userId: 'user-10',
    username: 'Morgan.L.Change',
    avatar: 'https://i.pravatar.cc/60?img=20',
    party: 'Independent',
    score: 10500.00,
    change: 8.75,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
    chartData: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  },
]

// Comments data
export const mockComments = {
  'reel-1': {
    cpComments: [
      {
        id: 'cp-1',
        userId: 'user-1',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=15',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem',
        likes: 23,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T11:00:00Z',
      },
      {
        id: 'cp-2',
        userId: 'user-2',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=16',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem',
        likes: 23,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T10:45:00Z',
      },
      {
        id: 'cp-3',
        userId: 'user-3',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=17',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem',
        likes: 23,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T10:30:00Z',
      },
    ],
    regularComments: [
      {
        id: 'reg-1',
        userId: 'user-4',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=18',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem',
        likes: 23,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T09:00:00Z',
      },
      {
        id: 'reg-2',
        userId: 'user-5',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=19',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem',
        likes: 23,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T08:30:00Z',
      },
      {
        id: 'reg-3',
        userId: 'user-1',
        username: 'datguy.wippa',
        avatar: 'https://i.pravatar.cc/40?img=20',
        party: 'The Pink Lady Party',
        text: 'lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum',
        likes: 23,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T08:00:00Z',
      },
    ],
  },
}

// Current user (logged in user simulation)
export const mockCurrentUser = {
  id: 'current-user',
  username: 'YourUsername',
  displayName: 'Your Name',
  avatar: 'https://i.pravatar.cc/100?img=20',
  party: 'Democrat',
  socialCredit: 5000,
  isVerified: false,
  nominations: [],
  following: ['user-1', 'user-2'],
  followers: 125,
}
