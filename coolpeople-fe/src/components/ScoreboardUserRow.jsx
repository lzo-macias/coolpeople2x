import '../styling/ScoreboardUserRow.css'
import Sparkline from './Sparkline'
import { getPartyColor, getTierFromPoints } from '../data/mockData'

// Rank colors for top 3
const RANK_COLORS = {
  1: '#d4a000', // gold
  2: '#8a8a8a', // silver
  3: '#a67c52', // bronze
}

function ScoreboardUserRow({ user, rank, onToggleFavorite, onOpenProfile, showLoadMore, isExpanded, onToggleExpand }) {
  const isPositive = user.change >= 0
  const sparklineColor = isPositive ? '#10b981' : '#ef4444'
  const partyColor = getPartyColor(user.party)

  // Get tier from score (using score as CP points)
  const tier = getTierFromPoints(user.score || 0)
  const rankColor = RANK_COLORS[rank] || '#999'

  return (
    <div className={`scoreboard-user-row ${showLoadMore ? 'has-load-more' : ''}`}>
      {/* Rank number */}
      <div className="user-rank">
        <span className="rank-number" style={{ color: rankColor }}>{rank}</span>
      </div>

      {/* Avatar with tier-based ring */}
      <div className="user-avatar-container" onClick={() => onOpenProfile?.(user)}>
        <div className="user-avatar-ring" style={{ borderColor: tier.color }}>
          <img
            src={user.avatar}
            alt={user.username}
            className="user-avatar"
          />
        </div>
      </div>

      {/* User info */}
      <div className="user-info">
        <span className="user-name">{user.username}</span>
        <span className="user-party">{user.party || 'Independent'}</span>
      </div>

      {/* Sparkline */}
      <div className="user-sparkline">
        <Sparkline
          data={user.sparklineData}
          color={sparklineColor}
          width={80}
          height={24}
          showBaseline={true}
          strokeWidth={2}
        />
      </div>

      {/* Score section - stacked vertically */}
      <div className="user-score-section">
        <div className="user-score-row">
          {tier.icon && (
            <img src={tier.icon} alt={tier.name} className="user-tier-icon" />
          )}
          <span className="user-score">{user.score.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <span className={`user-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{user.change.toFixed(2)}
        </span>
        <span
          className={`user-favorited ${user.isFavorited ? 'active' : ''}`}
          onClick={() => onToggleFavorite?.(user.userId)}
        >
          {user.isFavorited && 'Favorited'}
          <span className="star-icon">★</span>
        </span>
      </div>

      {/* Load more buttons - shown on last row when there are more */}
      {showLoadMore && (
        <div className={`load-more-buttons ${isExpanded ? 'collapsed' : ''}`} onClick={onToggleExpand}>
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
      )}
    </div>
  )
}

export default ScoreboardUserRow
