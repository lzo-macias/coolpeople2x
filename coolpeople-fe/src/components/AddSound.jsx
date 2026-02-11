import { useState, useEffect, useRef } from 'react'
import { reelsApi } from '../services/api'
import '../styling/AddSound.css'

// Royalty-free tracks from Mixkit (mixkit.co/free-stock-music/)
// Used as fallback content for "For You" when no DB sounds exist yet.
const mockSounds = [
  { id: 1, name: 'Sleepy Cat', artist: 'Alejandro Magana', duration: '1:59', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/135/135.mp3', image: 'https://mixkit.imgix.net/music/135/135-thumb-large.jpg?q=40&auto=format' },
  { id: 2, name: 'Lo-Fi 01', artist: 'Lily J', duration: '1:42', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/763/763.mp3', image: 'https://mixkit.imgix.net/music/763/763-thumb-large.jpg?q=40&auto=format' },
  { id: 3, name: 'Lo-Fi 02', artist: 'Lily J', duration: '1:38', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/764/764.mp3', image: 'https://mixkit.imgix.net/music/764/764-thumb-large.jpg?q=40&auto=format' },
  { id: 4, name: 'Lo-Fi 03', artist: 'Lily J', duration: '1:53', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/765/765.mp3', image: 'https://mixkit.imgix.net/music/765/765-thumb-large.jpg?q=40&auto=format' },
  { id: 5, name: 'Sweet September', artist: 'Arulo', duration: '1:39', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/282/282.mp3', image: 'https://mixkit.imgix.net/music/282/282-thumb-large.jpg?q=40&auto=format' },
  { id: 6, name: 'Day Dreamin\' with U', artist: 'Michael Ramir C.', duration: '1:58', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/988/988.mp3', image: 'https://mixkit.imgix.net/music/988/988-thumb-large.jpg?q=40&auto=format' },
  { id: 7, name: 'Slow Walk', artist: 'Michael Ramir C.', duration: '1:43', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/1009/1009.mp3', image: 'https://mixkit.imgix.net/music/1009/1009-thumb-large.jpg?q=40&auto=format' },
  { id: 8, name: 'Digital Clouds', artist: 'Alejandro Magana', duration: '1:41', genre: 'lofi', audioUrl: 'https://assets.mixkit.co/music/175/175.mp3', image: 'https://mixkit.imgix.net/music/175/175-thumb-large.jpg?q=40&auto=format' },
  { id: 9, name: 'Silent Descent', artist: 'Eugenio Mininni', duration: '2:40', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/614/614.mp3', image: 'https://mixkit.imgix.net/music/614/614-thumb-large.jpg?q=40&auto=format' },
  { id: 10, name: 'Epical Drums 01', artist: 'Grigoriy Nuzhny', duration: '1:46', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/676/676.mp3', image: 'https://mixkit.imgix.net/music/676/676-thumb-large.jpg?q=40&auto=format' },
  { id: 11, name: 'Epical Drums 02', artist: 'Grigoriy Nuzhny', duration: '2:03', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/677/677.mp3', image: 'https://mixkit.imgix.net/music/677/677-thumb-large.jpg?q=40&auto=format' },
  { id: 12, name: 'Drawing the Sky', artist: 'Eugenio Mininni', duration: '3:27', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/606/606.mp3', image: 'https://mixkit.imgix.net/music/606/606-thumb-large.jpg?q=40&auto=format' },
  { id: 13, name: 'The Journey', artist: 'Ahjay Stelino', duration: '1:48', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/79/79.mp3', image: 'https://mixkit.imgix.net/music/79/79-thumb-large.jpg?q=40&auto=format' },
  { id: 14, name: 'Trap Electro Vibes', artist: 'Alejandro Magana', duration: '1:56', genre: 'electronic', audioUrl: 'https://assets.mixkit.co/music/126/126.mp3', image: 'https://mixkit.imgix.net/music/126/126-thumb-large.jpg?q=40&auto=format' },
  { id: 15, name: 'Cyberpunk City', artist: 'Alejandro Magana', duration: '1:40', genre: 'electronic', audioUrl: 'https://assets.mixkit.co/music/140/140.mp3', image: 'https://mixkit.imgix.net/music/140/140-thumb-large.jpg?q=40&auto=format' },
  { id: 16, name: 'Infected Mushroom Vibes', artist: 'Alejandro Magana', duration: '1:30', genre: 'electronic', audioUrl: 'https://assets.mixkit.co/music/136/136.mp3', image: 'https://mixkit.imgix.net/music/136/136-thumb-large.jpg?q=40&auto=format' },
  { id: 17, name: 'Feeling Happy', artist: 'Ahjay Stelino', duration: '2:28', genre: 'pop', audioUrl: 'https://assets.mixkit.co/music/5/5.mp3', image: 'https://mixkit.imgix.net/music/5/5-thumb-large.jpg?q=40&auto=format' },
  { id: 18, name: 'Island Beat', artist: 'Arulo', duration: '1:42', genre: 'pop', audioUrl: 'https://assets.mixkit.co/music/250/250.mp3', image: 'https://mixkit.imgix.net/music/250/250-thumb-large.jpg?q=40&auto=format' },
  { id: 19, name: 'Happy Home', artist: 'Michael Ramir C.', duration: '1:50', genre: 'pop', audioUrl: 'https://assets.mixkit.co/music/801/801.mp3', image: 'https://mixkit.imgix.net/music/801/801-thumb-large.jpg?q=40&auto=format' },
  { id: 20, name: 'Summer Fun', artist: 'Ahjay Stelino', duration: '2:19', genre: 'pop', audioUrl: 'https://assets.mixkit.co/music/13/13.mp3', image: 'https://mixkit.imgix.net/music/13/13-thumb-large.jpg?q=40&auto=format' },
  { id: 21, name: 'Hip Hop 02', artist: 'Lily J', duration: '1:55', genre: 'hip-hop', audioUrl: 'https://assets.mixkit.co/music/738/738.mp3', image: 'https://mixkit.imgix.net/music/738/738-thumb-large.jpg?q=40&auto=format' },
  { id: 22, name: 'Complicated', artist: 'Arulo', duration: '1:49', genre: 'hip-hop', audioUrl: 'https://assets.mixkit.co/music/281/281.mp3', image: 'https://mixkit.imgix.net/music/281/281-thumb-large.jpg?q=40&auto=format' },
  { id: 23, name: 'Like a Loop Machine', artist: 'Michael Ramir C.', duration: '2:09', genre: 'hip-hop', audioUrl: 'https://assets.mixkit.co/music/876/876.mp3', image: 'https://mixkit.imgix.net/music/876/876-thumb-large.jpg?q=40&auto=format' },
  { id: 24, name: 'Valley Sunset', artist: 'Alejandro Magana', duration: '2:14', genre: 'ambient', audioUrl: 'https://assets.mixkit.co/music/127/127.mp3', image: 'https://mixkit.imgix.net/music/127/127-thumb-large.jpg?q=40&auto=format' },
  { id: 25, name: 'Spirit in the Woods', artist: 'Alejandro Magana', duration: '1:53', genre: 'ambient', audioUrl: 'https://assets.mixkit.co/music/139/139.mp3', image: 'https://mixkit.imgix.net/music/139/139-thumb-large.jpg?q=40&auto=format' },
  { id: 26, name: 'Smooth Jazz', artist: 'Francisco Alvear', duration: '2:22', genre: 'soul', audioUrl: 'https://assets.mixkit.co/music/640/640.mp3', image: 'https://mixkit.imgix.net/music/640/640-thumb-large.jpg?q=40&auto=format' },
  { id: 27, name: 'Games Worldbeat', artist: 'Bernardo R.', duration: '1:47', genre: 'motivational', audioUrl: 'https://assets.mixkit.co/music/466/466.mp3', image: 'https://mixkit.imgix.net/music/466/466-thumb-large.jpg?q=40&auto=format' },
  { id: 28, name: 'Serene View', artist: 'Arulo', duration: '1:54', genre: 'cinematic', audioUrl: 'https://assets.mixkit.co/music/443/443.mp3', image: 'https://mixkit.imgix.net/music/443/443-thumb-large.jpg?q=40&auto=format' },
]

const categories = ['For You', 'Trending', 'Saved']

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatViews = (count) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

function AddSound({ onClose, onSelectSound }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('For You')
  const [apiSounds, setApiSounds] = useState({ foryou: null, trending: null, saved: null })
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const fetchedRef = useRef({})

  // Fetch sounds from API when category changes
  useEffect(() => {
    const tabKey = activeCategory === 'For You' ? 'foryou' : activeCategory === 'Trending' ? 'trending' : 'saved'

    // Skip if already fetched
    if (fetchedRef.current[tabKey]) return

    const fetchSounds = async () => {
      setLoading(true)
      try {
        const result = await reelsApi.listSounds(tabKey)
        const sounds = result?.data?.sounds || result?.sounds || []
        setApiSounds(prev => ({ ...prev, [tabKey]: sounds }))
        fetchedRef.current[tabKey] = true

        // Track which sounds the user has saved
        if (tabKey === 'saved') {
          setSavedIds(new Set(sounds.map(s => s.id)))
        }
      } catch (err) {
        console.error('Failed to fetch sounds:', err)
        setApiSounds(prev => ({ ...prev, [tabKey]: [] }))
        fetchedRef.current[tabKey] = true
      } finally {
        setLoading(false)
      }
    }

    fetchSounds()
  }, [activeCategory])

  // Pre-fetch saved IDs on mount so we know which sounds are saved across all tabs
  useEffect(() => {
    const fetchSavedIds = async () => {
      try {
        const result = await reelsApi.listSounds('saved')
        const sounds = result?.data?.sounds || result?.sounds || []
        setSavedIds(new Set(sounds.map(s => s.id)))
      } catch (err) {
        // Silent fail — saved state just won't show
      }
    }
    fetchSavedIds()
  }, [])

  const toggleSaveSound = async (e, soundId) => {
    e.stopPropagation()
    const wasSaved = savedIds.has(soundId)

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      if (wasSaved) next.delete(soundId)
      else next.add(soundId)
      return next
    })

    try {
      if (wasSaved) {
        await reelsApi.unsaveSound(soundId)
      } else {
        await reelsApi.saveSound(soundId)
      }
      // Invalidate saved tab cache so it re-fetches
      fetchedRef.current['saved'] = false
      setApiSounds(prev => ({ ...prev, saved: null }))
    } catch (err) {
      console.error('Failed to toggle save:', err)
      // Revert on error
      setSavedIds(prev => {
        const next = new Set(prev)
        if (wasSaved) next.add(soundId)
        else next.delete(soundId)
        return next
      })
    }
  }

  // Get display sounds for current category
  const getDisplaySounds = () => {
    const tabKey = activeCategory === 'For You' ? 'foryou' : activeCategory === 'Trending' ? 'trending' : 'saved'
    const fetched = apiSounds[tabKey]

    // Normalize API sounds to match the shape AddSound expects
    const normalizeApiSound = (s) => ({
      id: s.id,
      name: s.name,
      artist: s.artistName || 'Unknown',
      duration: typeof s.duration === 'number' ? formatDuration(s.duration) : s.duration,
      audioUrl: s.audioUrl,
      useCount: s.useCount || 0,
      totalViews: s.totalViews || 0,
      image: null,
    })

    if (tabKey === 'foryou') {
      const apiList = (fetched || []).map(normalizeApiSound)
      // Merge: API sounds first, then mock sounds
      return [...apiList, ...mockSounds]
    }

    if (tabKey === 'trending') {
      if (!fetched || fetched.length === 0) return []
      return fetched.map(normalizeApiSound)
    }

    if (tabKey === 'saved') {
      if (!fetched || fetched.length === 0) return []
      return fetched.map(normalizeApiSound)
    }

    return mockSounds
  }

  const displaySounds = getDisplaySounds()

  // Filter by search
  const filteredSounds = displaySounds.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || (s.genre && s.genre.toLowerCase().includes(q))
  })

  const handleSelectSound = (sound) => {
    onSelectSound?.(sound)
    onClose()
  }

  return (
    <div className="add-sound-screen">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F2EA" />
            <stop offset="100%" stopColor="#FF2A55" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="add-sound-header">
        <button className="add-sound-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h1 className="add-sound-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#iconGradient)">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Add Sound
        </h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Search Bar */}
      <div className="add-sound-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search sounds"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="add-sound-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`add-sound-category ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sound List */}
      <div className="add-sound-list">
        {loading && (
          <div className="add-sound-loading">Loading...</div>
        )}
        {!loading && filteredSounds.length === 0 && (
          <div className="add-sound-empty">
            {activeCategory === 'Saved' ? 'No saved sounds yet' : activeCategory === 'Trending' ? 'No trending sounds yet' : 'No sounds found'}
          </div>
        )}
        {!loading && filteredSounds.map((sound) => (
          <div
            key={sound.id}
            className="add-sound-item"
            onClick={() => handleSelectSound(sound)}
          >
            <div className="add-sound-play">
              {sound.image ? (
                <img src={sound.image} alt={sound.name} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="url(#iconGradient)">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              )}
            </div>

            <div className="add-sound-info">
              <span className="add-sound-name">{sound.name}</span>
              <span className="add-sound-artist">{sound.artist} · {sound.duration}</span>
            </div>

            <div className="add-sound-plays">
              {activeCategory === 'Trending' && sound.totalViews > 0 ? (
                <span className="add-sound-genre">{formatViews(sound.totalViews)} views · {sound.useCount} posts</span>
              ) : sound.useCount > 0 ? (
                <span className="add-sound-genre">{sound.useCount} reels</span>
              ) : sound.genre ? (
                <span className="add-sound-genre">{sound.genre}</span>
              ) : null}
            </div>

            {/* Save/unsave bookmark — only for API sounds (have uuid id) */}
            {typeof sound.id === 'string' && (
              <button
                className={`add-sound-save-btn ${savedIds.has(sound.id) ? 'saved' : ''}`}
                onClick={(e) => toggleSaveSound(e, sound.id)}
                title={savedIds.has(sound.id) ? 'Unsave' : 'Save'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={savedIds.has(sound.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AddSound
