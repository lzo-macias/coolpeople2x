import '../styling/EngagementScoreBar.css'
import Sparkline from './Sparkline'
import { getPartyColor } from '../data/mockData'

function EngagementScoreBar({ scores }) {
  if (!scores || scores.length === 0) return null

  return (
    <div className="engagement-bar">
      {scores.map((score, idx) => {
        // Random position for the change indicator
        const randomTop = Math.random() * 60 + 10 // 10-70%
        const randomLeft = Math.random() * 40 + 30 // 30-70%
        const partyColor = getPartyColor(score.party)

        return (
          <div key={score.id || idx} className="engagement-item">
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
                    top: `${randomTop}%`,
                    left: `${randomLeft}%`,
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
