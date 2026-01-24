// Mock data for CoolPeople app
// This will be replaced with real API calls to backend

// CoolPeople Tier System
// Icon paths for dark mode (use /icons/tiers/light/ for light mode)
export const CP_TIERS = [
  {
    name: 'Bronze',
    min: 0,
    max: 999,
    color: '#a67c52',
    icon: '/icons/tiers/dark/bronze.svg'
  },
  {
    name: 'Silver',
    min: 1000,
    max: 2499,
    color: '#8a8a8a',
    icon: '/icons/tiers/dark/silver.svg'
  },
  {
    name: 'Gold',
    min: 2500,
    max: 4999,
    color: '#d4a000',
    icon: '/icons/tiers/dark/gold.svg'
  },
  {
    name: 'Diamond',
    min: 5000,
    max: 9999,
    color: '#5b9bd5',
    icon: '/icons/tiers/dark/diamond.svg'
  },
  {
    name: 'Challenger',
    min: 10000,
    max: 24999,
    color: '#9B59B6',
    icon: '/icons/tiers/dark/challenger.svg'
  },
  {
    name: 'Master',
    min: 25000,
    max: Infinity,
    color: '#ef4444',
    icon: '/icons/tiers/dark/master.svg'
  },
]

// Get tier from CP points
export const getTierFromPoints = (points) => {
  return CP_TIERS.find(tier => points >= tier.min && points <= tier.max) || CP_TIERS[0]
}

// Party colors - each party has a unique color used for user borders app-wide
export const PARTY_COLORS = {
  'Democrat': '#0015BC',
  'Republican': '#E81B23',
  'Green': '#17AA5C',
  'Libertarian': '#FED105',
  'The Pink Lady Party': '#e91e8c',
  'Progressive': '#9333ea',
}

// Color for independent users (no party affiliation)
export const INDEPENDENT_COLOR = '#808080'

// Helper to get party color - returns gray for null/undefined (independent)
export const getPartyColor = (party) => {
  if (!party) return INDEPENDENT_COLOR
  return PARTY_COLORS[party] || '#00d4d4'
}

// Helper to generate sparkline data (jagged stock chart pattern)
export const generateSparklineData = (trend = 'up', points = 20) => {
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
    party: null, // Independent - no party affiliation
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
    targetRace: 'Mayor Race',
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
        party: null, // Independent - no party affiliation
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
    targetRace: 'City Council',
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
      party: null, // Independent - no party affiliation
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
  { id: 'story-4', userId: 'user-4', name: 'Mike T', image: 'https://i.pravatar.cc/100?img=8', hasNew: true, party: null },
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

// Parties (note: "Independent" is not a party - it means no party affiliation)
export const mockParties = [
  { id: 'party-1', name: 'Democrat', color: '#0015BC', members: 15420 },
  { id: 'party-2', name: 'Republican', color: '#E81B23', members: 14280 },
  { id: 'party-3', name: 'Green', color: '#17AA5C', members: 3200 },
  { id: 'party-4', name: 'Libertarian', color: '#FED105', members: 2100 },
  { id: 'party-5', name: 'The Pink Lady Party', color: '#e91e8c', members: 9999 },
]

// Party Profiles (detailed data for party profile pages)
export const mockPartyProfiles = {
  'The Pink Lady Party': {
    id: 'party-6',
    name: 'The Pink Lady',
    fullName: 'The Pink Lady Party',
    avatar: 'https://i.pravatar.cc/150?img=12',
    color: '#e91e8c',
    members: '9,999',
    followers: '1M',
    change: '+301.26',
    sparklineData: [45, 48, 46, 52, 55, 53, 58, 62, 60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90],
    bio: 'A progressive party focused on equality, justice, and community empowerment.',
  },
  'Democrat': {
    id: 'party-1',
    name: 'Democrat',
    fullName: 'Democratic Party',
    avatar: 'https://i.pravatar.cc/150?img=20',
    color: '#0015BC',
    members: '15,420',
    followers: '2.5M',
    change: '+150.50',
    sparklineData: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88],
    bio: 'Fighting for working families and a stronger middle class.',
  },
  'Republican': {
    id: 'party-2',
    name: 'Republican',
    fullName: 'Republican Party',
    avatar: 'https://i.pravatar.cc/150?img=22',
    color: '#E81B23',
    members: '14,280',
    followers: '2.3M',
    change: '+120.30',
    sparklineData: [42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80],
    bio: 'Preserving liberty, freedom, and traditional values.',
  },
  'Green': {
    id: 'party-4',
    name: 'Green',
    fullName: 'Green Party',
    avatar: 'https://i.pravatar.cc/150?img=30',
    color: '#17AA5C',
    members: '3,200',
    followers: '350K',
    change: '+89.15',
    sparklineData: [30, 35, 38, 42, 45, 50, 55, 58, 62, 65, 68, 72, 75, 78, 80, 82, 85, 88, 90, 92],
    bio: 'Environmental justice and sustainable futures for all.',
  },
  'Libertarian': {
    id: 'party-5',
    name: 'Libertarian',
    fullName: 'Libertarian Party',
    avatar: 'https://i.pravatar.cc/150?img=35',
    color: '#FED105',
    members: '2,100',
    followers: '250K',
    change: '+32.80',
    sparklineData: [25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 70, 72, 75, 78, 80, 82],
    bio: 'Maximum freedom, minimum government.',
  },
}

// Participant profiles (users who haven't opted into social credit)
export const mockParticipants = {
  'participant-1': {
    id: 'participant-1',
    username: 'William.Hiya',
    avatar: 'https://i.pravatar.cc/150?img=12',
    party: null, // Independent
    nominations: '9,999',
    followers: '1M',
    isFollowing: false,
    hasOptedIn: false,
    posts: [
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    ],
  },
  'participant-2': {
    id: 'participant-2',
    username: 'William.Hiya',
    avatar: 'https://i.pravatar.cc/150?img=12',
    party: 'The Pink Lady Party', // In a party
    nominations: '9,999',
    followers: '1M',
    isFollowing: false,
    hasOptedIn: false,
    posts: [
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    ],
  },
  'participant-own': {
    id: 'participant-own',
    username: 'William.Hiya',
    avatar: 'https://i.pravatar.cc/150?img=12',
    party: null, // Independent
    nominations: '9,999',
    followers: '1M',
    isFollowing: false,
    hasOptedIn: false, // Shows "opt in" link
    posts: [
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    ],
  },
}

// Scoreboard data
export const mockScoreboard = [
  {
    rank: 1,
    userId: 'user-1',
    username: 'Lzo.macias.formayor',
    avatar: 'https://i.pravatar.cc/60?img=1',
    party: 'The Pink Lady Party',
    score: 8750,
    change: 187.50,
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
    score: 6200,
    change: -92.30,
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
    score: 4500,
    change: 25.20,
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
    score: 3247,
    change: -87.50,
    isFavorited: false,
    sparklineData: generateSparklineData('down', 15),
    chartData: [0.9, 1.0, 1.2, 1.3, 1.5, 1.6, 1.8, 1.9, 2.1, 2.3, 2.5],
  },
  {
    rank: 5,
    userId: 'user-5',
    username: 'Alex.M.Progressive',
    avatar: 'https://i.pravatar.cc/60?img=3',
    party: null, // Independent - no party affiliation
    score: 2850,
    change: 42.30,
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
    score: 1850,
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
    score: 1200,
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
    score: 890,
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
    score: 650,
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
    party: null, // Independent - no party affiliation
    score: 420,
    change: 8.75,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
    chartData: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  },
]

// Party Scoreboard data (for party races like "Best Party")
export const mockPartyScoreboard = [
  {
    rank: 1,
    partyId: 'party-6',
    partyName: 'The Pink Lady Party',
    color: '#e91e8c',
    avatar: 'https://i.pravatar.cc/60?img=23',
    members: 9999,
    score: 8750,
    change: 245.50,
    isFavorited: true,
    sparklineData: generateSparklineData('up', 15),
  },
  {
    rank: 2,
    partyId: 'party-1',
    partyName: 'Democrat',
    color: '#0015BC',
    avatar: 'https://i.pravatar.cc/60?img=20',
    members: 15420,
    score: 7200,
    change: -120.30,
    isFavorited: true,
    sparklineData: generateSparklineData('down', 15),
  },
  {
    rank: 3,
    partyId: 'party-2',
    partyName: 'Republican',
    color: '#E81B23',
    avatar: 'https://i.pravatar.cc/60?img=22',
    members: 14280,
    score: 6500,
    change: 89.20,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
  },
  {
    rank: 4,
    partyId: 'party-3',
    partyName: 'Green',
    color: '#17AA5C',
    avatar: 'https://i.pravatar.cc/60?img=30',
    members: 3200,
    score: 2800,
    change: 56.40,
    isFavorited: false,
    sparklineData: generateSparklineData('up', 15),
  },
  {
    rank: 5,
    partyId: 'party-4',
    partyName: 'Libertarian',
    color: '#FED105',
    avatar: 'https://i.pravatar.cc/60?img=35',
    members: 2100,
    score: 1500,
    change: -18.90,
    isFavorited: false,
    sparklineData: generateSparklineData('down', 15),
  },
]

// Comments data
// profileType: 'candidate' (opted into social credit) or 'participant' (not opted in)
export const mockComments = {
  'reel-1': {
    cpComments: [
      {
        id: 'cp-1',
        userId: 'user-1',
        username: 'Lzo.macias',
        avatar: 'https://i.pravatar.cc/40?img=15',
        party: 'The Pink Lady Party',
        profileType: 'candidate', // Opted into social credit
        text: 'This is exactly what we need more of in politics! Real people making real change.',
        likes: 23,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T11:00:00Z',
      },
      {
        id: 'cp-2',
        userId: 'user-2',
        username: 'Sarah.Politics',
        avatar: 'https://i.pravatar.cc/40?img=16',
        party: 'Democrat',
        profileType: 'participant', // Not opted in, in a party
        text: 'Love seeing this kind of engagement from the community. Keep it up!',
        likes: 45,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T10:45:00Z',
      },
      {
        id: 'cp-3',
        userId: 'user-3',
        username: 'Mike.Independent',
        avatar: 'https://i.pravatar.cc/40?img=17',
        party: null, // Independent participant
        profileType: 'participant',
        text: 'As an independent voter, this really speaks to me. Great content!',
        likes: 18,
        isCP: true,
        replies: [],
        createdAt: '2024-01-15T10:30:00Z',
      },
    ],
    regularComments: [
      {
        id: 'reg-1',
        userId: 'user-4',
        username: 'William.Hiya',
        avatar: 'https://i.pravatar.cc/40?img=18',
        party: 'The Pink Lady Party',
        profileType: 'candidate', // Candidate profile
        text: 'Really inspiring message here. This is why I got into politics.',
        likes: 67,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T09:00:00Z',
      },
      {
        id: 'reg-2',
        userId: 'user-5',
        username: 'Alex.Voter',
        avatar: 'https://i.pravatar.cc/40?img=19',
        party: 'Republican',
        profileType: 'participant', // Participant in Republican party
        text: 'Interesting perspective, thanks for sharing!',
        likes: 12,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T08:30:00Z',
      },
      {
        id: 'reg-3',
        userId: 'user-6',
        username: 'Jordan.Civic',
        avatar: 'https://i.pravatar.cc/40?img=20',
        party: null, // Independent participant
        profileType: 'participant',
        text: 'This is what democracy looks like. People coming together!',
        likes: 34,
        isCP: false,
        replies: [],
        createdAt: '2024-01-15T08:00:00Z',
      },
    ],
  },
}

// Conversation data (individual chat messages)
export const mockConversations = {
  'msg-1': [
    { id: 'c1', text: 'Lorem Ipsum lorem ipsum', isOwn: false, timestamp: '2:30 PM' },
    { id: 'c2', text: 'Lorem Ipsum lorem ipsum', isOwn: true, timestamp: '2:31 PM' },
    { id: 'c3', text: 'Lorem Ipsum lorem ipsum', isOwn: false, timestamp: '2:32 PM' },
    { id: 'c4', text: 'Lorem Ipsum lorem ipsum', isOwn: true, timestamp: '2:33 PM' },
    { id: 'c5', text: 'Lorem Ipsum lorem ipsum', isOwn: false, timestamp: '2:34 PM' },
    { id: 'c6', text: 'Lorem Ipsum lorem ipsum', isOwn: true, timestamp: '2:35 PM' },
    { id: 'c7', text: 'Lorem Ipsum lorem ipsum', isOwn: false, timestamp: '2:36 PM' },
    { id: 'c8', text: 'All fat pum pum lady', isOwn: false, timestamp: '2:37 PM' },
  ],
  'msg-2': [
    { id: 'c1', text: 'Hey there!', isOwn: false, timestamp: '1:00 PM' },
    { id: 'c2', text: 'All fat pum pum lady', isOwn: false, timestamp: '1:05 PM' },
  ],
  'msg-3': [
    { id: 'c1', text: 'What do you think about the campaign?', isOwn: true, timestamp: '12:00 PM' },
    { id: 'c2', text: 'All fat pum pum lady', isOwn: false, timestamp: '12:30 PM' },
  ],
}

// Messages data
export const mockMessages = [
  {
    id: 'msg-1',
    user: {
      username: 'The Pink Lady',
      avatar: 'https://i.pravatar.cc/60?img=23',
      party: 'The Pink Lady Party',
    },
    lastMessage: 'All fat pum pum lady',
    timestamp: '2m',
    unreadCount: 63,
    isOnline: true,
    hasUnread: true,
    isParty: true,
    partyName: 'The Pink Lady Party',
    partyAvatar: 'https://i.pravatar.cc/60?img=23',
    partyColor: '#EC4899',
  },
  {
    id: 'msg-2',
    user: {
      username: 'Lorem.ipsum',
      avatar: 'https://i.pravatar.cc/60?img=24',
      party: null, // Independent - no party affiliation
    },
    lastMessage: 'All fat pum pum lady',
    timestamp: '15m',
    unreadCount: 0,
    isOnline: false,
    hasUnread: false,
  },
  {
    id: 'msg-3',
    user: {
      username: 'Lorem.ipsum',
      avatar: 'https://i.pravatar.cc/60?img=25',
      party: 'The Pink Lady Party',
    },
    lastMessage: 'All fat pum pum lady',
    timestamp: '1h',
    unreadCount: 0,
    isOnline: false,
    hasUnread: true,
  },
  {
    id: 'msg-4',
    user: {
      username: 'Lorem.ipsum',
      avatar: 'https://i.pravatar.cc/60?img=26',
      party: null, // Independent - no party affiliation
    },
    lastMessage: 'All fat pum pum lady',
    timestamp: '2h',
    unreadCount: 0,
    isOnline: false,
    hasUnread: false,
  },
  {
    id: 'msg-5',
    user: {
      username: 'Boy.that.runs.for.office',
      avatar: 'https://i.pravatar.cc/60?img=27',
      party: null, // Independent - no party affiliation
    },
    lastMessage: 'BOY YOU ARE CRAZY',
    timestamp: '3h',
    unreadCount: 0,
    isOnline: false,
    hasUnread: false,
  },
  {
    id: 'msg-6',
    user: {
      username: 'The Pink Lady',
      avatar: 'https://i.pravatar.cc/60?img=23',
      party: 'The Pink Lady Party',
    },
    lastMessage: 'Hey girl hey!',
    timestamp: '5h',
    unreadCount: 0,
    isOnline: true,
    hasUnread: true,
    isParty: true,
    partyName: 'The Pink Lady Party',
    partyAvatar: 'https://i.pravatar.cc/60?img=23',
    partyColor: '#EC4899',
  },
]

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
