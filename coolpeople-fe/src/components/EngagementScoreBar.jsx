import { useMemo } from 'react'
import '../styling/EngagementScoreBar.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

// Helper to determine trend from sparkline data
const getTrend = (data) => {
  if (!data || data.length < 2) return 'stable'
  const first = data[0]
  const last = data[data.length - 1]
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'stable'
}

// Helper to determine if change is positive
const isPositiveChange = (change) => {
  if (!change) return true
  return change.startsWith('+') || (!change.startsWith('-') && parseFloat(change) >= 0)
}

function EngagementScoreBar({ scores, onItemClick }) {
  // Return empty spacer to maintain flex layout even when no scores
  if (!scores || scores.length === 0) return <div className="engagement-bar-spacer" />

  // Generate stable random positions once per score
  const randomPositions = useMemo(() => {
    return scores.map(() => ({
      top: Math.random() * 60 + 10,
      left: Math.random() * 40 + 30,
    }))
  }, [scores])

  return (
    <div className="engagement-bar">
      {scores.map((score, idx) => {
        const partyColor = getPartyColor(score.party)
        const positions = randomPositions[idx]
        const trend = getTrend(score.sparklineData)
        const sparklineColor = trend === 'up' ? '#00ff00' : trend === 'down' ? '#ff3b3b' : '#00ff00'
        const isPositive = isPositiveChange(score.recentChange)

        return (
          <div
            key={score.id || idx}
            className="engagement-item clickable"
            onClick={() => onItemClick?.(score)}
          >
            <div className="engagement-header">
              <div className="engagement-avatar-wrapper" style={{ borderColor: partyColor }}>
                <img
                  src={score.avatar}
                  alt={score.username}
                  className="engagement-avatar"
                />
              </div>
              <span className="engagement-username">{score.username}</span>
            </div>
            <div className="engagement-chart">
              <Sparkline
                data={score.sparklineData}
                color={sparklineColor}
                width={70}
                height={50}
              />
              {score.recentChange && (
                <span
                  className={`engagement-change ${isPositive ? 'positive' : 'negative'}`}
                  style={{
                    top: `${positions.top}%`,
                    left: `${positions.left}%`,
                  }}
                >
                  {score.recentChange}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default EngagementScoreBar
