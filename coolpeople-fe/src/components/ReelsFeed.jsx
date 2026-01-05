import '../styling/ReelsFeed.css'
import ReelCard from './ReelCard'

const mockReels = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
    user: {
      username: 'William.H.ForMayor',
      party: 'Democrat',
      avatar: 'https://i.pravatar.cc/40?img=12'
    },
    candidates: [
      { id: 1, username: 'Lzo.macias.formayor', progress: 80 },
      { id: 2, username: 'Lzo.macias.formayor', progress: 60 },
      { id: 3, username: 'Lzo.macias.formayor', progress: 40 },
    ],
    stats: { votes: '9,999', likes: '9,999', comments: '9,999', shazam: '9,999', shares: '9,999' }
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=700&fit=crop',
    user: {
      username: 'Sarah.J.Council',
      party: 'Republican',
      avatar: 'https://i.pravatar.cc/40?img=5'
    },
    candidates: [
      { id: 1, username: 'Sarah.J.Council', progress: 70 },
      { id: 2, username: 'Mike.T.District4', progress: 50 },
      { id: 3, username: 'Lisa.K.Mayor', progress: 30 },
    ],
    stats: { votes: '5,432', likes: '8,765', comments: '1,234', shazam: '567', shares: '2,345' }
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=700&fit=crop',
    user: {
      username: 'Alex.M.Progressive',
      party: 'Independent',
      avatar: 'https://i.pravatar.cc/40?img=8'
    },
    candidates: [
      { id: 1, username: 'Alex.M.Progressive', progress: 90 },
      { id: 2, username: 'Jordan.P.Green', progress: 45 },
      { id: 3, username: 'Casey.R.Future', progress: 25 },
    ],
    stats: { votes: '12,345', likes: '15,678', comments: '3,456', shazam: '890', shares: '4,567' }
  }
]

function ReelsFeed() {
  return (
    <div className="reels-feed">
      {mockReels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  )
}

export default ReelsFeed
