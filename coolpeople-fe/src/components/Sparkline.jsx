import '../styling/Sparkline.css'

function Sparkline({ data: rawData, color = '#00ff00', width = 80, height = 30, dashed = false, strokeWidth = 1.5, showBaseline = false }) {
  if (!rawData || rawData.length === 0) return null

  // If only one data point, duplicate it so we can render a flat line
  const data = rawData.length === 1 ? [rawData[0], rawData[0]] : rawData

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Baseline is the first value (daily open)
  const baseline = data[0]
  const baselineY = height - ((baseline - min) / range) * height

  // Generate SVG path for jagged line
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Main solid line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "3 3" : "none"}
      />
      {/* Baseline dashed line on top (daily open) */}
      {showBaseline && (
        <line
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.4}
        />
      )}
    </svg>
  )
}

export default Sparkline
