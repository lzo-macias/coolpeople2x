/**
 * Engagement Relevance Engine
 *
 * Selects contextually relevant candidates/parties for the engagement bar
 * per reel. Uses multi-signal scoring combined with weighted random sampling
 * to ensure each reel shows a different but relevant set of candidates.
 *
 * Scoring signals:
 *  1. Race match — reel's targetRace matches candidate's race (strongest)
 *  2. Followed/competing race — candidate is in a race the user cares about
 *  3. Party affinity — shared political alignment with reel creator or viewer
 *  4. Trending momentum — significant recent score changes surface movers
 *  5. Engagement history — past interactions with race or candidate
 *  6. Discovery injection — surface trending unknowns from unfollowed races
 */

// Deterministic per-reel random using reel ID as seed
function seededRandom(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0
    return (hash >>> 0) / 4294967296
  }
}

/**
 * Weighted sampling without replacement.
 * Picks `count` items from `pool` where each item's probability
 * is proportional to its weight. Different RNG seeds produce
 * different selections — this is what makes each reel unique.
 */
function weightedSample(pool, count, rng) {
  const remaining = pool.map(item => ({ ...item }))
  const selected = []

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Compute cumulative weights
    const totalWeight = remaining.reduce((sum, item) => sum + (item._weight || 1), 0)
    if (totalWeight <= 0) break

    const roll = rng() * totalWeight
    let cumulative = 0

    for (let j = 0; j < remaining.length; j++) {
      cumulative += remaining[j]._weight || 1
      if (roll <= cumulative) {
        selected.push(remaining[j])
        remaining.splice(j, 1)
        break
      }
    }
  }

  return selected
}

/**
 * Normalize a raw scoreboard API entry into the engagement score format
 * used by EngagementScoreBar.
 */
export function normalizeScoreboardEntry(entry, idx, fallbackSparkline) {
  const user = entry.user || entry
  const sparklinePoints = entry.sparkline?.map(s => s.points) || []
  let todayChange = entry.todayChange || entry.change || null
  if (todayChange == null && sparklinePoints.length >= 2) {
    todayChange = Math.round(
      (sparklinePoints[sparklinePoints.length - 1] - sparklinePoints[sparklinePoints.length - 2]) * 100
    ) / 100
  }
  const trend = todayChange > 0 ? 'up' : todayChange < 0 ? 'down' : 'stable'

  return {
    id: `eng-${user.id || idx}`,
    odId: user.id,
    userId: user.id,
    username: user.handle || user.username || user.displayName || `Candidate ${idx + 1}`,
    avatar: user.avatarUrl || user.avatar || `https://i.pravatar.cc/40?img=${(idx % 70) + 1}`,
    party: user.party?.name || null,
    sparklineData: sparklinePoints.length > 0 ? sparklinePoints : (fallbackSparkline ? fallbackSparkline(trend) : []),
    recentChange: todayChange ? (todayChange > 0 ? `+${todayChange}` : `${todayChange}`) : null,
    changeValue: todayChange || 0,
    trend,
    totalPoints: entry.totalPoints || 0,
  }
}

/**
 * Select engagement bar items for a specific reel based on relevance scoring
 * combined with weighted random sampling so every reel gets different candidates.
 *
 * @param {Object} reel - The reel being displayed
 * @param {Object} allScoreboards - { raceName: { raceId, raceName, entries[] } }
 * @param {Object} userContext - User preference signals
 * @returns {{ scores: Array, raceName: string }}
 */
export function selectEngagementForReel(reel, allScoreboards, userContext) {
  if (!allScoreboards || Object.keys(allScoreboards).length === 0) {
    return { scores: [], raceName: reel?.targetRace || 'CoolPeople' }
  }

  const {
    followedRaces = [],
    competingRaces = [],
    party: userParty,
    activity = [],
    userId,
    username,
  } = userContext || {}

  const followedRaceSet = new Set(followedRaces.map(r => r.title || r.name || r))
  const competingRaceSet = new Set(competingRaces.map(r => r.title || r.name || r))

  // Build interaction fingerprint from user activity
  const interactedRaces = new Set()
  const interactedUserIds = new Set()
  activity.forEach(a => {
    if (a.video?.race) interactedRaces.add(a.video.race)
    if (a.reel?.targetRace) interactedRaces.add(a.reel.targetRace)
    if (a.reel?.user?.id) interactedUserIds.add(a.reel.user.id)
    if (a.reel?.user?.username) interactedUserIds.add(a.reel.user.username)
  })

  // Seed RNG with reel ID for deterministic but unique-per-reel results
  const rng = seededRandom(reel?.id?.toString() || `reel-${Date.now()}`)

  // For reels without targetRace, rotate emphasis across followed races
  const followedRacesList = [...followedRaceSet]
  let focusRace = null
  if (!reel?.targetRace && followedRacesList.length > 0) {
    const focusIdx = Math.floor(rng() * followedRacesList.length)
    focusRace = followedRacesList[focusIdx]
  }

  // Also rotate across ALL available races for variety when no followed races
  const allRaceNames = Object.keys(allScoreboards)
  if (!reel?.targetRace && !focusRace && allRaceNames.length > 1) {
    const focusIdx = Math.floor(rng() * allRaceNames.length)
    focusRace = allRaceNames[focusIdx]
  }

  // Score every candidate across every scoreboard
  const scoredCandidates = []

  Object.entries(allScoreboards).forEach(([raceName, scoreboardData]) => {
    const entries = scoreboardData.entries || []

    entries.forEach(entry => {
      // Skip current user
      if (entry.userId === userId || entry.username === username) return

      let score = 0

      // --- SIGNAL 1: Race relevance (0-50) ---
      if (reel?.targetRace && raceName === reel.targetRace) {
        score += 50 // Direct race match — strongest signal
      } else if (raceName === focusRace) {
        score += 35 // Rotated focus race for this reel
      } else if (competingRaceSet.has(raceName)) {
        score += 25 // User competes here
      } else if (followedRaceSet.has(raceName)) {
        score += 20 // User follows this race
      } else {
        score += 5  // Discovery pool
      }

      // --- SIGNAL 2: Party affinity (0-15) ---
      if (entry.party) {
        if (entry.party === reel?.user?.party) {
          score += 10
        }
        if (entry.party === userParty) {
          score += 5
        }
      }

      // --- SIGNAL 3: Trending momentum (0-25) ---
      const absChange = Math.abs(entry.changeValue || 0)
      if (absChange > 0) {
        score += Math.min(absChange * 2.5, 25)
      }

      // --- SIGNAL 4: Engagement history (0-15) ---
      if (interactedRaces.has(raceName)) {
        score += 10
      }
      if (interactedUserIds.has(entry.userId) || interactedUserIds.has(entry.username)) {
        score += 5
      }

      // --- SIGNAL 5: Discovery boost for trending unknowns (0-10) ---
      if (!followedRaceSet.has(raceName) && !competingRaceSet.has(raceName)) {
        const trendingBoost = absChange > 5 ? 8 : absChange > 2 ? 5 : 2
        score += rng() * trendingBoost
      }

      scoredCandidates.push({
        ...entry,
        raceName,
        _relevanceScore: score,
        // Weight for sampling: exponential so higher scores are more likely
        // but lower scores still have a real chance of being selected
        _weight: Math.pow(Math.max(score, 1), 1.5),
      })
    })
  })

  // Weighted random sampling — this is what makes each reel different.
  // Higher-scored candidates are more likely to be picked, but the
  // seeded RNG ensures different reels draw different candidates.
  const selected = weightedSample(scoredCandidates, 3, rng)

  // Determine display race name
  let displayRaceName = reel?.targetRace
  if (!displayRaceName && selected.length > 0) {
    const raceFreq = {}
    selected.forEach(c => { raceFreq[c.raceName] = (raceFreq[c.raceName] || 0) + 1 })
    displayRaceName = Object.entries(raceFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
  }
  displayRaceName = displayRaceName || 'CoolPeople'

  // Clean output — strip internal scoring fields
  const scores = selected.map(c => ({
    id: c.id,
    odId: c.odId || c.userId,
    username: c.username,
    avatar: c.avatar,
    party: c.party,
    sparklineData: c.sparklineData,
    recentChange: c.recentChange,
    trend: c.trend,
    totalPoints: c.totalPoints,
  }))

  return { scores, raceName: displayRaceName }
}
