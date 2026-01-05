import { useState, useRef } from 'react'
import './styling/App.css'
import NominationStories from './components/NominationStories'
import NominationCard from './components/NominationCard'
import InviteFriends from './components/InviteFriends'
import ReelCard from './components/ReelCard'
import BottomNav from './components/BottomNav'
import CommentsSection from './components/CommentsSection'
import Scoreboard from './components/Scoreboard'
import CandidateProfile from './components/CandidateProfile'
import { mockReels } from './data/mockData'

// Pages: 0 = Scoreboard, 1 = Home/Reels, 2 = Search
const PAGES = ['scoreboard', 'home', 'search']

function App() {
  const [currentPage, setCurrentPage] = useState(1) // Start on home
  const [showComments, setShowComments] = useState(false)
  const [activeReel, setActiveReel] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [activeCandidate, setActiveCandidate] = useState(null)

  // Swipe handling
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentPage < PAGES.length - 1) {
        // Swipe left -> go right
        setCurrentPage(currentPage + 1)
      } else if (diff < 0 && currentPage > 0) {
        // Swipe right -> go left
        setCurrentPage(currentPage - 1)
      }
    }
  }

  const handleOpenComments = (reel) => {
    setActiveReel(reel)
    setShowComments(true)
  }

  const handleCloseComments = () => {
    setShowComments(false)
    setActiveReel(null)
  }

  const handleOpenProfile = (candidate) => {
    setActiveCandidate(candidate)
    setShowProfile(true)
  }

  const handleCloseProfile = () => {
    setShowProfile(false)
    setActiveCandidate(null)
  }

  const handleNavClick = (page) => {
    const pageIndex = PAGES.indexOf(page)
    if (pageIndex !== -1) {
      setCurrentPage(pageIndex)
    }
  }

  return (
    <div className="app">
      <div
        className="pages-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${currentPage * 100}%)`,
        }}
      >
        {/* Scoreboard Page */}
        <div className="page">
          <Scoreboard onOpenProfile={handleOpenProfile} />
        </div>

        {/* Home/Reels Page */}
        <div className="page">
          <div className="scroll-container">
            {/* Home Section */}
            <section className="home-section">
              <NominationStories />
              <NominationCard />
              <InviteFriends />

              {/* Reel preview peeking */}
              <div className="reel-peek-section">
                <ReelCard reel={mockReels[0]} isPreview={true} />
              </div>
            </section>

            {/* Reels Section - scroll down to enter */}
            <section className="reels-section">
              {mockReels.map((reel) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  onOpenComments={() => handleOpenComments(reel)}
                />
              ))}
            </section>
          </div>
        </div>

        {/* Search Page (placeholder) */}
        <div className="page">
          <div className="search-placeholder">
            <h2>Search</h2>
            <p>Coming soon...</p>
          </div>
        </div>
      </div>

      <BottomNav
        currentPage={PAGES[currentPage]}
        onNavigate={handleNavClick}
        theme={PAGES[currentPage] === 'scoreboard' ? 'light' : 'dark'}
      />

      {/* Comments overlay */}
      {showComments && (
        <CommentsSection
          reel={activeReel}
          onClose={handleCloseComments}
        />
      )}

      {/* Candidate Profile overlay */}
      {showProfile && (
        <div className="profile-overlay">
          <CandidateProfile
            candidate={activeCandidate}
            onClose={handleCloseProfile}
          />
        </div>
      )}
    </div>
  )
}

export default App
