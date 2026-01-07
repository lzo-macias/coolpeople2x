import { useState } from 'react'
import '../styling/ExplorePage.css'

const FILTER_TAGS = ['For You', 'Trending', 'Following', 'Politics', 'Local']

// Mock explore videos - mix of sizes for masonry effect
const EXPLORE_VIDEOS = [
  { id: 'exp-1', thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop', views: '1.2M', isLarge: true },
  { id: 'exp-2', thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=400&fit=crop', views: '890K', isLarge: false },
  { id: 'exp-3', thumbnail: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=400&fit=crop', views: '2.1M', isLarge: false },
  { id: 'exp-4', thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=600&fit=crop', views: '456K', isLarge: true },
  { id: 'exp-5', thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=400&fit=crop', views: '3.4M', isLarge: false },
  { id: 'exp-6', thumbnail: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&h=400&fit=crop', views: '567K', isLarge: false },
  { id: 'exp-7', thumbnail: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=600&fit=crop', views: '1.8M', isLarge: true },
  { id: 'exp-8', thumbnail: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=400&fit=crop', views: '234K', isLarge: false },
  { id: 'exp-9', thumbnail: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=400&h=400&fit=crop', views: '789K', isLarge: false },
  { id: 'exp-10', thumbnail: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&h=600&fit=crop', views: '1.5M', isLarge: true },
  { id: 'exp-11', thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop', views: '345K', isLarge: false },
  { id: 'exp-12', thumbnail: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&h=400&fit=crop', views: '678K', isLarge: false },
  { id: 'exp-13', thumbnail: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=600&fit=crop', views: '2.3M', isLarge: true },
  { id: 'exp-14', thumbnail: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=400&fit=crop', views: '912K', isLarge: false },
  { id: 'exp-15', thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop', views: '456K', isLarge: false },
]

function ExplorePage({ onVideoClick }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('For You')

  return (
    <div className="explore-page">
      {/* Search Bar */}
      <div className="explore-header">
        <div className="explore-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="explore-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="explore-search-clear" onClick={() => setSearchQuery('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tags */}
      <div className="explore-filters">
        {FILTER_TAGS.map(tag => (
          <button
            key={tag}
            className={`explore-filter-tag ${activeFilter === tag ? 'active' : ''}`}
            onClick={() => setActiveFilter(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Masonry Video Grid */}
      <div className="explore-masonry">
        {[0, 1, 2].map(colIndex => (
          <div key={colIndex} className="masonry-column">
            {EXPLORE_VIDEOS.filter((_, i) => i % 3 === colIndex).map(video => (
              <div
                key={video.id}
                className={`masonry-item ${video.isLarge ? 'large' : ''}`}
                onClick={() => onVideoClick?.(video)}
              >
                <img src={video.thumbnail} alt="" />
                <div className="masonry-overlay">
                  <div className="masonry-views">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>{video.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExplorePage
