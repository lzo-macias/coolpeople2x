import { useState } from 'react'
import '../styling/AddSound.css'

const mockSounds = [
  { id: 1, name: 'Trending Beat', artist: 'DJ Cool', duration: '0:30', plays: '2.5M', image: 'https://i.pravatar.cc/100?img=1' },
  { id: 2, name: 'Summer Vibes', artist: 'Beach Boys', duration: '0:15', plays: '1.8M', image: 'https://i.pravatar.cc/100?img=2' },
  { id: 3, name: 'Epic Drop', artist: 'Bass Master', duration: '0:45', plays: '3.2M', image: 'https://i.pravatar.cc/100?img=3' },
  { id: 4, name: 'Chill Lo-Fi', artist: 'Lofi Girl', duration: '1:00', plays: '5.1M', image: 'https://i.pravatar.cc/100?img=4' },
  { id: 5, name: 'Pop Hit 2024', artist: 'Chart Topper', duration: '0:30', plays: '8.7M', image: 'https://i.pravatar.cc/100?img=5' },
  { id: 6, name: 'Viral Sound', artist: 'Internet Famous', duration: '0:15', plays: '12M', image: 'https://i.pravatar.cc/100?img=6' },
]

const categories = ['For You', 'Trending', 'Favorites', 'Recently Used']

function AddSound({ onClose, onSelectSound }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('For You')
  const [playingId, setPlayingId] = useState(null)

  const handlePlayPause = (id) => {
    setPlayingId(playingId === id ? null : id)
  }

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
        {mockSounds.map((sound) => (
          <div
            key={sound.id}
            className="add-sound-item"
            onClick={() => handleSelectSound(sound)}
          >
            <div className="add-sound-play">
              <img src={sound.image} alt={sound.name} />
            </div>

            <div className="add-sound-info">
              <span className="add-sound-name">{sound.name}</span>
              <span className="add-sound-artist">{sound.artist} · {sound.duration}</span>
            </div>

            <div className="add-sound-plays">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>{sound.plays}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AddSound
