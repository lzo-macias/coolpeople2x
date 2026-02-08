import { useState } from 'react'
import '../styling/AddSound.css'

// Royalty-free tracks from Mixkit (mixkit.co/free-stock-music/)
// All tracks are free for commercial and personal use under the Mixkit Stock Music Free License.
// Audio URLs are direct CDN links (CloudFront-backed) with CORS support (Access-Control-Allow-Origin: *).
const mockSounds = [
  // --- Lofi / Chill ---
  {
    id: 1,
    name: 'Sleepy Cat',
    artist: 'Alejandro Magana',
    duration: '1:59',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/lo-fi-beats/',
    audioUrl: 'https://assets.mixkit.co/music/135/135.mp3',
    image: 'https://mixkit.imgix.net/music/135/135-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 2,
    name: 'Lo-Fi 01',
    artist: 'Lily J',
    duration: '1:42',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/lo-fi-beats/',
    audioUrl: 'https://assets.mixkit.co/music/763/763.mp3',
    image: 'https://mixkit.imgix.net/music/763/763-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 3,
    name: 'Lo-Fi 02',
    artist: 'Lily J',
    duration: '1:38',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/lo-fi-beats/',
    audioUrl: 'https://assets.mixkit.co/music/764/764.mp3',
    image: 'https://mixkit.imgix.net/music/764/764-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 4,
    name: 'Lo-Fi 03',
    artist: 'Lily J',
    duration: '1:53',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/765/765.mp3',
    image: 'https://mixkit.imgix.net/music/765/765-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 5,
    name: 'Sweet September',
    artist: 'Arulo',
    duration: '1:39',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/lo-fi-beats/',
    audioUrl: 'https://assets.mixkit.co/music/282/282.mp3',
    image: 'https://mixkit.imgix.net/music/282/282-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 6,
    name: 'Day Dreamin\' with U',
    artist: 'Michael Ramir C.',
    duration: '1:58',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/chillout/',
    audioUrl: 'https://assets.mixkit.co/music/988/988.mp3',
    image: 'https://mixkit.imgix.net/music/988/988-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 7,
    name: 'Slow Walk',
    artist: 'Michael Ramir C.',
    duration: '1:43',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/chillout/',
    audioUrl: 'https://assets.mixkit.co/music/1009/1009.mp3',
    image: 'https://mixkit.imgix.net/music/1009/1009-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 8,
    name: 'Digital Clouds',
    artist: 'Alejandro Magana',
    duration: '1:41',
    genre: 'lofi',
    pageUrl: 'https://mixkit.co/free-stock-music/chillout/',
    audioUrl: 'https://assets.mixkit.co/music/175/175.mp3',
    image: 'https://mixkit.imgix.net/music/175/175-thumb-large.jpg?q=40&auto=format',
  },
  // --- Cinematic ---
  {
    id: 9,
    name: 'Silent Descent',
    artist: 'Eugenio Mininni',
    duration: '2:40',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/614/614.mp3',
    image: 'https://mixkit.imgix.net/music/614/614-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 10,
    name: 'Epical Drums 01',
    artist: 'Grigoriy Nuzhny',
    duration: '1:46',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/676/676.mp3',
    image: 'https://mixkit.imgix.net/music/676/676-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 11,
    name: 'Epical Drums 02',
    artist: 'Grigoriy Nuzhny',
    duration: '2:03',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/677/677.mp3',
    image: 'https://mixkit.imgix.net/music/677/677-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 12,
    name: 'Drawing the Sky',
    artist: 'Eugenio Mininni',
    duration: '3:27',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/606/606.mp3',
    image: 'https://mixkit.imgix.net/music/606/606-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 13,
    name: 'The Journey',
    artist: 'Ahjay Stelino',
    duration: '1:48',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/79/79.mp3',
    image: 'https://mixkit.imgix.net/music/79/79-thumb-large.jpg?q=40&auto=format',
  },
  // --- Electronic ---
  {
    id: 14,
    name: 'Trap Electro Vibes',
    artist: 'Alejandro Magana',
    duration: '1:56',
    genre: 'electronic',
    pageUrl: 'https://mixkit.co/free-stock-music/electronic/',
    audioUrl: 'https://assets.mixkit.co/music/126/126.mp3',
    image: 'https://mixkit.imgix.net/music/126/126-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 15,
    name: 'Cyberpunk City',
    artist: 'Alejandro Magana',
    duration: '1:40',
    genre: 'electronic',
    pageUrl: 'https://mixkit.co/free-stock-music/electronic/',
    audioUrl: 'https://assets.mixkit.co/music/140/140.mp3',
    image: 'https://mixkit.imgix.net/music/140/140-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 16,
    name: 'Infected Mushroom Vibes',
    artist: 'Alejandro Magana',
    duration: '1:30',
    genre: 'electronic',
    pageUrl: 'https://mixkit.co/free-stock-music/electronic/',
    audioUrl: 'https://assets.mixkit.co/music/136/136.mp3',
    image: 'https://mixkit.imgix.net/music/136/136-thumb-large.jpg?q=40&auto=format',
  },
  // --- Pop / Upbeat ---
  {
    id: 17,
    name: 'Feeling Happy',
    artist: 'Ahjay Stelino',
    duration: '2:28',
    genre: 'pop',
    pageUrl: 'https://mixkit.co/free-stock-music/pop/',
    audioUrl: 'https://assets.mixkit.co/music/5/5.mp3',
    image: 'https://mixkit.imgix.net/music/5/5-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 18,
    name: 'Island Beat',
    artist: 'Arulo',
    duration: '1:42',
    genre: 'pop',
    pageUrl: 'https://mixkit.co/free-stock-music/pop/',
    audioUrl: 'https://assets.mixkit.co/music/250/250.mp3',
    image: 'https://mixkit.imgix.net/music/250/250-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 19,
    name: 'Happy Home',
    artist: 'Michael Ramir C.',
    duration: '1:50',
    genre: 'pop',
    pageUrl: 'https://mixkit.co/free-stock-music/pop/',
    audioUrl: 'https://assets.mixkit.co/music/801/801.mp3',
    image: 'https://mixkit.imgix.net/music/801/801-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 20,
    name: 'Summer Fun',
    artist: 'Ahjay Stelino',
    duration: '2:19',
    genre: 'pop',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/13/13.mp3',
    image: 'https://mixkit.imgix.net/music/13/13-thumb-large.jpg?q=40&auto=format',
  },
  // --- Hip-Hop / Trap ---
  {
    id: 21,
    name: 'Hip Hop 02',
    artist: 'Lily J',
    duration: '1:55',
    genre: 'hip-hop',
    pageUrl: 'https://mixkit.co/free-stock-music/hip-hop/',
    audioUrl: 'https://assets.mixkit.co/music/738/738.mp3',
    image: 'https://mixkit.imgix.net/music/738/738-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 22,
    name: 'Complicated',
    artist: 'Arulo',
    duration: '1:49',
    genre: 'hip-hop',
    pageUrl: 'https://mixkit.co/free-stock-music/hip-hop/',
    audioUrl: 'https://assets.mixkit.co/music/281/281.mp3',
    image: 'https://mixkit.imgix.net/music/281/281-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 23,
    name: 'Like a Loop Machine',
    artist: 'Michael Ramir C.',
    duration: '2:09',
    genre: 'hip-hop',
    pageUrl: 'https://mixkit.co/free-stock-music/hip-hop/',
    audioUrl: 'https://assets.mixkit.co/music/876/876.mp3',
    image: 'https://mixkit.imgix.net/music/876/876-thumb-large.jpg?q=40&auto=format',
  },
  // --- Ambient / Chillout ---
  {
    id: 24,
    name: 'Valley Sunset',
    artist: 'Alejandro Magana',
    duration: '2:14',
    genre: 'ambient',
    pageUrl: 'https://mixkit.co/free-stock-music/ambient/',
    audioUrl: 'https://assets.mixkit.co/music/127/127.mp3',
    image: 'https://mixkit.imgix.net/music/127/127-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 25,
    name: 'Spirit in the Woods',
    artist: 'Alejandro Magana',
    duration: '1:53',
    genre: 'ambient',
    pageUrl: 'https://mixkit.co/free-stock-music/ambient/',
    audioUrl: 'https://assets.mixkit.co/music/139/139.mp3',
    image: 'https://mixkit.imgix.net/music/139/139-thumb-large.jpg?q=40&auto=format',
  },
  // --- Soul / Funk ---
  {
    id: 26,
    name: 'Smooth Jazz',
    artist: 'Francisco Alvear',
    duration: '2:22',
    genre: 'soul',
    pageUrl: 'https://mixkit.co/free-stock-music/chillout/',
    audioUrl: 'https://assets.mixkit.co/music/640/640.mp3',
    image: 'https://mixkit.imgix.net/music/640/640-thumb-large.jpg?q=40&auto=format',
  },
  // --- Motivational ---
  {
    id: 27,
    name: 'Games Worldbeat',
    artist: 'Bernardo R.',
    duration: '1:47',
    genre: 'motivational',
    pageUrl: 'https://mixkit.co/free-stock-music/cinematic/',
    audioUrl: 'https://assets.mixkit.co/music/466/466.mp3',
    image: 'https://mixkit.imgix.net/music/466/466-thumb-large.jpg?q=40&auto=format',
  },
  {
    id: 28,
    name: 'Serene View',
    artist: 'Arulo',
    duration: '1:54',
    genre: 'cinematic',
    pageUrl: 'https://mixkit.co/free-stock-music/chillout/',
    audioUrl: 'https://assets.mixkit.co/music/443/443.mp3',
    image: 'https://mixkit.imgix.net/music/443/443-thumb-large.jpg?q=40&auto=format',
  },
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
        {mockSounds
          .filter((s) => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q)
          })
          .map((sound) => (
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
              <span className="add-sound-genre">{sound.genre}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

  )
}

export default AddSound
