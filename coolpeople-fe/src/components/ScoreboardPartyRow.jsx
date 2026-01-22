import '../styling/ScoreboardPartyRow.css'
import Sparkline from './Sparkline'
import { getTierFromPoints } from '../data/mockData'

// Rank colors for top 3
const RANK_COLORS = {
  1: '#d4a000', // gold
  2: '#8a8a8a', // silver
  3: '#a67c52', // bronze
}

function ScoreboardPartyRow({ party, rank, onToggleFavorite, onOpenProfile, showLoadMore, isExpanded, onToggleExpand }) {
  const isPositive = party.change >= 0
  const sparklineColor = isPositive ? '#10b981' : '#ef4444'

  // Get tier from score (using score as CP points)
  const tier = getTierFromPoints(party.score || 0)
  const rankColor = RANK_COLORS[rank] || '#999'

  return (
    <div className={`scoreboard-party-row ${showLoadMore ? 'has-load-more' : ''}`}>
      {/* Rank number */}
      <div className="party-rank">
        <span className="rank-number" style={{ color: rankColor }}>{rank}</span>
      </div>

      {/* Party Avatar with color ring */}
      <div className="party-avatar-container" onClick={() => onOpenProfile?.(party)}>
        <div className="party-avatar-ring" style={{ borderColor: party.color }}>
          <img
            src={party.avatar}
            alt={party.partyName}
            className="party-avatar"
          />
        </div>
      </div>

      {/* Party info */}
      <div className="party-info">
        <span className="party-name">{party.partyName}</span>
        <span className="party-members">{party.members.toLocaleString()} members</span>
      </div>

      {/* Sparkline */}
      <div className="party-sparkline">
        <Sparkline
          data={party.sparklineData}
          color={sparklineColor}
          width={80}
          height={24}
          showBaseline={true}
          strokeWidth={2}
        />
      </div>

      {/* Score section - stacked vertically */}
      <div className="party-score-section">
        <div className="party-score-row">
          {tier.svgPath && (
            <svg className="party-tier-icon" viewBox="0 0 24 24" fill={tier.color} title={tier.name}>
              <path d={tier.svgPath} />
            </svg>
          )}
          <span className="party-score">{party.score.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <span className={`party-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{party.change.toFixed(2)}
        </span>
        <span
          className={`party-favorited ${party.isFavorited ? 'active' : ''}`}
          onClick={() => onToggleFavorite?.(party.partyId)}
        >
          {party.isFavorited && 'Favorited'}
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

export default ScoreboardPartyRow
