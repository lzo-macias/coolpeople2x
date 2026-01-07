import '../styling/ReelCard.css'
import ReelActions from './ReelActions'
import EngagementScoreBar from './EngagementScoreBar'
import { getPartyColor } from '../data/mockData'

// Helper to generate sparkline data
const generateSparklineData = (trend = 'up', points = 20) => {
  const data = []
  let value = 50 + Math.random() * 20
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * 15
    const trendBias = trend === 'up' ? 0.5 : trend === 'down' ? -0.5 : 0
    value = Math.max(10, Math.min(90, value + change + trendBias))
    data.push(value)
  }
  return data
}

function ReelCard({ reel, isPreview = false, onOpenComments, onUsernameClick, onPartyClick, onEngagementClick }) {
  const defaultReel = {
    id: 1,
    videoUrl: null,
    thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
    user: {
      username: 'William.H.ForMayor',
      party: 'Democrat',
      avatar: 'https://i.pravatar.cc/40?img=12',
    },
    title: 'THE BEST TEAM EVER GO TEAM TEAM',
    caption: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Building together!',
    engagementScores: [
      {
        id: 'eng-1',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=1',
        sparklineData: generateSparklineData('up'),
        recentChange: null,
      },
      {
        id: 'eng-2',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=12',
        sparklineData: generateSparklineData('down'),
        recentChange: '+1',
      },
      {
        id: 'eng-3',
        username: 'Lzo.macias.formayor',
        avatar: 'https://i.pravatar.cc/40?img=5',
        sparklineData: generateSparklineData('stable'),
        recentChange: null,
      },
    ],
    stats: {
      votes: '9,999',
      likes: '9,999',
      comments: '9,999',
      shazam: '9,999',
      shares: '9,999',
    },
  }

  const data = reel || defaultReel

  if (isPreview) {
    return (
      <div className="reel-preview">
        <div
          className="reel-preview-bg"
          style={{ backgroundImage: `url(${data.thumbnail})` }}
        />
        <div className="reel-preview-overlay">
          <div className="reel-preview-info">
            <button className="party-tag clickable" onClick={() => onPartyClick?.(data.user.party)}>
              {data.user.party}
            </button>
            <button className="username clickable" onClick={() => onUsernameClick?.(data.user)}>
              @{data.user.username}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reel-card">
      <div
        className="reel-media"
        style={{ backgroundImage: `url(${data.thumbnail})` }}
      />

      <div className="reel-overlay">
        {/* Top engagement sparkline charts */}
        <EngagementScoreBar scores={data.engagementScores} onItemClick={onEngagementClick} />

        {/* Right side actions */}
        <div className="reel-actions-container">
          <ReelActions user={data.user} stats={data.stats} onOpenComments={onOpenComments} />
        </div>

        {/* Bottom info */}
        <div className="reel-bottom">
          <div className="reel-info">
            <div className="reel-user-row">
              <img
                src={data.user.avatar}
                alt={data.user.username}
                className="reel-user-avatar clickable"
                style={{ borderColor: getPartyColor(data.user.party) }}
                onClick={() => onUsernameClick?.(data.user)}
              />
              <div className="reel-user-details">
                <button className="party-tag clickable" onClick={() => onPartyClick?.(data.user.party)}>
                  {data.user.party}
                </button>
                <button className="username clickable" onClick={() => onUsernameClick?.(data.user)}>
                  {data.user.username}
                </button>
              </div>
            </div>
            <p className="reel-title">{data.title}</p>
            <p className="reel-caption">{data.caption}</p>
          </div>
          <button className="nominate-btn"><span>Nominate</span></button>
        </div>
      </div>
    </div>
  )
}

export default ReelCard
