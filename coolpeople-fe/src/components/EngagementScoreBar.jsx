import { useMemo } from 'react'
import '../styling/EngagementScoreBar.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

function EngagementScoreBar({ scores, onItemClick }) {
  if (!scores || scores.length === 0) return null

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
                color="#00ff00"
                width={100}
                height={24}
              />
              {score.recentChange && (
                <span
                  className="engagement-change"
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
