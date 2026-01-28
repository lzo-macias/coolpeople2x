import '../styling/ReelsFeed.css'
import ReelCard from './ReelCard'

// Empty for fresh start - reels will be loaded from backend API
const mockReels = []

function ReelsFeed() {
  if (mockReels.length === 0) {
    return (
      <div className="reels-feed reels-feed--empty">
        <div className="reels-empty-state">
          <p>No reels yet</p>
          <p className="reels-empty-subtitle">Be the first to create a reel!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reels-feed">
      {mockReels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  )
}

export default ReelsFeed
