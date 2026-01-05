import { useState } from 'react'
import '../styling/Scoreboard.css'
import ScoreboardUserRow from './ScoreboardUserRow'
import ScoreboardChart from './ScoreboardChart'
import { mockScoreboard, getPartyColor } from '../data/mockData'

// Mock recommended users
const recommendedUsers = [
  { id: 'rec-1', username: 'william.hiya', avatar: 'https://i.pravatar.cc/100?img=33', party: 'Democrat' },
  { id: 'rec-2', username: 'sarap', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'rec-3', username: 'whatstea', avatar: 'https://i.pravatar.cc/100?img=32', party: 'Independent' },
  { id: 'rec-4', username: 'periodp', avatar: 'https://i.pravatar.cc/100?img=25', party: 'Green' },
  { id: 'rec-5', username: 'coolcat', avatar: 'https://i.pravatar.cc/100?img=36', party: 'Democrat' },
]

// Mock front runners
const frontRunners = [
  { id: 'fr-2', rank: 2, label: 'Second Place', nominations: '18,000', avatar: 'https://i.pravatar.cc/100?img=11', party: 'Democrat' },
  { id: 'fr-1', rank: 1, label: 'Current Front Runner', nominations: '25,000', avatar: 'https://i.pravatar.cc/100?img=47', party: 'Republican' },
  { id: 'fr-3', rank: 3, label: 'Third Place', nominations: '15,000', avatar: 'https://i.pravatar.cc/100?img=44', party: 'Independent' },
]

function Scoreboard({ onOpenProfile }) {
  const [users, setUsers] = useState(mockScoreboard)
  const [timePeriod, setTimePeriod] = useState('this month')
  const [viewMode, setViewMode] = useState('global') // 'global' or 'local'

  const today = new Date()
  const dateString = `${today.getDate()} of ${today.toLocaleString('en-US', { month: 'long' }).toLowerCase()}`

  const favoritedUsers = users.filter(u => u.isFavorited)

  const handleToggleFavorite = (userId) => {
    setUsers(users.map(user =>
      user.userId === userId
        ? { ...user, isFavorited: !user.isFavorited }
        : user
    ))
  }

  return (
    <div className="scoreboard-page">
      {/* Header */}
      <div className="scoreboard-header">
        <h1 className="scoreboard-title">Scoreboard</h1>
        <button
          className="view-toggle"
          onClick={() => setViewMode(viewMode === 'global' ? 'local' : 'global')}
        >
          switch to {viewMode === 'global' ? 'local' : 'global'}
        </button>
      </div>

      <p className="scoreboard-date">{dateString}</p>

      {/* Favorited users list */}
      <div className="favorited-users">
        {favoritedUsers.map(user => (
          <ScoreboardUserRow
            key={user.userId}
            user={user}
            onToggleFavorite={handleToggleFavorite}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>

      {/* Time period dropdown */}
      <div className="time-period-selector">
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className="time-period-dropdown"
        >
          <option value="this week">this week</option>
          <option value="this month">this month</option>
          <option value="this year">this year</option>
          <option value="all time">all time</option>
        </select>
      </div>

      {/* Chart */}
      <ScoreboardChart users={users} />

      {/* Recommended for you */}
      <div className="recommended-section">
        <h3 className="recommended-title">Recommended for you</h3>
        <div className="recommended-scroll">
          {recommendedUsers.map(user => (
            <div key={user.id} className="recommended-user">
              <div
                className="recommended-avatar-ring"
                style={{ borderColor: getPartyColor(user.party) }}
              >
                <img src={user.avatar} alt={user.username} className="recommended-avatar" />
              </div>
              <span className="recommended-username">{user.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CoolPeople Title */}
      <h1 className="coolpeople-title">CoolPeople</h1>

      {/* Current Front Runner Section */}
      <div className="front-runner-section">
        {frontRunners.map(runner => (
          <div
            key={runner.id}
            className={`front-runner-item ${runner.rank === 1 ? 'front-runner-first' : 'front-runner-other'}`}
          >
            <div
              className="front-runner-avatar-ring"
              style={{ borderColor: getPartyColor(runner.party) }}
            >
              <img src={runner.avatar} alt={runner.username} className="front-runner-avatar" />
              {runner.rank === 1 && <span className="front-runner-badge">1</span>}
            </div>
            <span className="front-runner-label">{runner.label}</span>
            <span className="front-runner-nominations">{runner.nominations} Nominations</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Scoreboard
