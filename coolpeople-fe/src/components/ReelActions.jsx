import { useState } from 'react'
import '../styling/ReelActions.css'
import { getPartyColor } from '../data/mockData'

function ReelActions({ user, stats, onOpenComments }) {
  const partyColor = getPartyColor(user?.party)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(stats?.likes || '9,999')

  const handleLike = () => {
    if (isLiked) {
      // Parse and decrement
      const num = parseInt(likeCount.replace(/,/g, '')) - 1
      setLikeCount(num.toLocaleString())
    } else {
      // Parse and increment
      const num = parseInt(likeCount.replace(/,/g, '')) + 1
      setLikeCount(num.toLocaleString())
    }
    setIsLiked(!isLiked)
  }

  return (
    <div className="reel-actions">
      {/* Profile with follow badge */}
      <button className="action-btn profile-btn">
        <img
          src={user?.avatar || 'https://i.pravatar.cc/40?img=1'}
          alt="profile"
          className="action-avatar"
          style={{ borderColor: partyColor }}
        />
        <span className="follow-badge">+</span>
      </button>

      {/* Vote up/down */}
      <button className="action-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 4v8M8 8l4-4 4 4" />
          <path d="M12 20v-8M8 16l4 4 4-4" />
        </svg>
        <span className="action-count">{stats?.votes || '9,999'}</span>
      </button>

      {/* Heart/Like */}
      <button className={`action-btn like-action ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill={isLiked ? '#ff6b9d' : 'none'} stroke={isLiked ? '#ff6b9d' : 'currentColor'} strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="action-count">{likeCount}</span>
      </button>

      {/* Comment with face */}
      <button className="action-btn" onClick={onOpenComments}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path d="M9 13h6" />
          <path d="M12 17v4" />
          <path d="M8 21h8" />
        </svg>
        <span className="action-count">{stats?.comments || '9,999'}</span>
      </button>

      {/* Shazam-style */}
      <button className="action-btn shazam-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M14.5 8.5c0 0-2 1-2 3.5s2 3.5 2 3.5" />
          <path d="M9.5 15.5c0 0 2-1 2-3.5s-2-3.5-2-3.5" />
        </svg>
        <span className="action-count">{stats?.shazam || '9,999'}</span>
      </button>

      {/* Share */}
      <button className="action-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span className="action-count">{stats?.shares || '9,999'}</span>
      </button>
    </div>
  )
}

export default ReelActions
