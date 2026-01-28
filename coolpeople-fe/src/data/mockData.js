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

// Users / Candidates - Empty for fresh start
export const mockUsers = []

// Engagement scores for sparklines (shown at top of reels)
export const mockEngagementScores = []

// Reels data - Empty for fresh start
export const mockReels = []

// Nomination stories (top of home page) - Only keep the add button
export const mockNominationStories = [
  { id: 'story-add', isAdd: true },
]

// Contacts for invite friends - Empty for fresh start
export const mockContacts = []

// Parties - Empty for fresh start (users will create their own)
export const mockParties = []

// Party Profiles - Empty for fresh start
export const mockPartyProfiles = {}

// Participant profiles - Empty for fresh start
export const mockParticipants = {}

// Scoreboard data - Empty for fresh start
export const mockScoreboard = []

// Party Scoreboard data - Empty for fresh start
export const mockPartyScoreboard = []

// Comments data - Empty for fresh start
export const mockComments = {}

// Conversation data - Empty for fresh start
export const mockConversations = {}

// Messages data - Empty for fresh start
export const mockMessages = []

// Current user - Will be set after login/registration
export const mockCurrentUser = null
