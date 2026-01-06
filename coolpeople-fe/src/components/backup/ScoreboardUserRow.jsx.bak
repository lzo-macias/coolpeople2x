import '../styling/ScoreboardUserRow.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

function ScoreboardUserRow({ user, onToggleFavorite, onOpenProfile }) {
  const isPositive = user.change >= 0
  const sparklineColor = isPositive ? '#00cc66' : '#ff4444'
  const partyColor = getPartyColor(user.party)

  return (
    <div className="scoreboard-user-row">
      <div className="user-avatar-container" onClick={() => onOpenProfile?.(user)}>
        <img
          src={user.avatar}
          alt={user.username}
          className="user-avatar"
          style={{ borderColor: partyColor, cursor: 'pointer' }}
        />
      </div>

      <div className="user-info">
        <span className="user-name">{user.username}</span>
        <span className="user-party">{user.party}</span>
      </div>

      <div className="user-sparkline">
        <Sparkline
          data={user.sparklineData}
          color={sparklineColor}
          width={60}
          height={20}
        />
      </div>

      <div className="user-score-section">
        <span className="user-score">{user.score.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span className={`user-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{user.change.toFixed(2)}
        </span>
      </div>

      <button
        className={`favorite-btn ${user.isFavorited ? 'favorited' : ''}`}
        onClick={() => onToggleFavorite?.(user.userId)}
      >
        {user.isFavorited ? 'Favorited' : 'Favorite'}
        <span className="star-icon">★</span>
      </button>
    </div>
  )
}

export default ScoreboardUserRow
