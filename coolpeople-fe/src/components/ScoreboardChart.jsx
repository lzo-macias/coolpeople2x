import '../styling/ScoreboardChart.css'

// Line styles based on ranking
// Top 1: 100% opacity, weight 3
// Ranks 2-5: 70% opacity, weight 2
// Ranks 6+: 40% opacity, weight 1.5
const getLineStyle = (index) => {
  const baseColor = '#2186EB'
  if (index === 0) {
    return { color: baseColor, opacity: 1, weight: 3 }
  } else if (index < 5) {
    return { color: baseColor, opacity: 0.7, weight: 2 }
  } else {
    return { color: baseColor, opacity: 0.4, weight: 1.5 }
  }
}

function ScoreboardChart({ users }) {
  const width = 400
  const height = 400
  const padding = { top: 30, right: 55, bottom: 35, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Find max value for scaling
  const allValues = users.flatMap(u => u.chartData || [])
  const maxValue = Math.max(...allValues) * 1.1
  const yLabels = ['3M', '2M', '1M']

  // X-axis labels
  const xLabels = ['9th', '18th', 'Today']

  // Generate path for each user
  const generatePath = (data) => {
    if (!data || data.length < 2) return ''
    const points = data.map((value, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight
      return `${x},${y}`
    })
    return `M ${points.join(' L ')}`
  }

  // Get endpoint position for avatar
  const getEndpoint = (data) => {
    if (!data || data.length === 0) return { x: 0, y: 0 }
    const lastValue = data[data.length - 1]
    const x = padding.left + chartWidth
    const y = padding.top + chartHeight - (lastValue / maxValue) * chartHeight
    return { x, y }
  }

  return (
    <div className="scoreboard-chart">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {yLabels.map((label, i) => {
          const y = padding.top + (i / (yLabels.length - 1)) * chartHeight
          return (
            <g key={label}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#eee"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#999"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const x = padding.left + (i / (xLabels.length - 1)) * chartWidth
          return (
            <text
              key={label}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#999"
            >
              {label}
            </text>
          )
        })}

        {/* Lines for each user */}
        {users.map((user, index) => {
          const style = getLineStyle(index)
          return (
            <path
              key={user.userId}
              d={generatePath(user.chartData)}
              fill="none"
              stroke={style.color}
              strokeWidth={style.weight}
              strokeOpacity={style.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>

      {/* Avatars at endpoints */}
      <div className="chart-avatars">
        {users.map((user, index) => {
          const endpoint = getEndpoint(user.chartData)
          return (
            <img
              key={user.userId}
              src={user.avatar}
              alt={user.username}
              className="chart-avatar"
              style={{
                position: 'absolute',
                left: `${endpoint.x + 5}px`,
                top: `${endpoint.y - 12}px`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ScoreboardChart
