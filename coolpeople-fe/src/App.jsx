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
import PartyProfile from './components/PartyProfile'
import ParticipantProfile from './components/ParticipantProfile'
import ExplorePage from './components/ExplorePage'
import MyProfile from './components/MyProfile'
import MyBallot from './components/MyBallot'
import Messages from './components/Messages'
import CreateScreen from './components/CreateScreen'
import { mockReels, mockPartyProfiles, mockParticipants } from './data/mockData'

// Pages: 0 = Scoreboard, 1 = Home/Reels, 2 = Search, 3 = Messages, 4 = Campaign/Ballot, 5 = Profile
const PAGES = ['scoreboard', 'home', 'search', 'messages', 'campaign', 'profile']

function App() {
  const [currentPage, setCurrentPage] = useState(1) // Start on home
  const [showComments, setShowComments] = useState(false)
  const [activeReel, setActiveReel] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [activeCandidate, setActiveCandidate] = useState(null)
  const [showPartyProfile, setShowPartyProfile] = useState(false)
  const [activeParty, setActiveParty] = useState(null)
  const [showParticipantProfile, setShowParticipantProfile] = useState(false)
  const [activeParticipant, setActiveParticipant] = useState(null)
  const [isOwnParticipantProfile, setIsOwnParticipantProfile] = useState(false)
  const [isInConversation, setIsInConversation] = useState(false)
  const [showCreateScreen, setShowCreateScreen] = useState(false)
  const [hasBallotNotification, setHasBallotNotification] = useState(true)
  const [userParty, setUserParty] = useState(null) // User's created party

  // Navigation history stack
  const [navHistory, setNavHistory] = useState([])

  // Save current overlay state to history
  const saveToHistory = () => {
    const currentState = {
      showComments,
      activeReel,
      showProfile,
      activeCandidate,
      showPartyProfile,
      activeParty,
      showParticipantProfile,
      activeParticipant,
      isOwnParticipantProfile,
    }
    // Only save if something is open
    if (showComments || showProfile || showPartyProfile || showParticipantProfile) {
      setNavHistory(prev => [...prev, currentState])
    }
  }

  // Go back to previous state
  const handleBack = () => {
    if (navHistory.length === 0) {
      // Nothing in history, just close everything
      setShowComments(false)
      setShowProfile(false)
      setShowPartyProfile(false)
      setShowParticipantProfile(false)
      return
    }

    const prevState = navHistory[navHistory.length - 1]
    setNavHistory(prev => prev.slice(0, -1))

    // Restore previous state
    setShowComments(prevState.showComments)
    setActiveReel(prevState.activeReel)
    setShowProfile(prevState.showProfile)
    setActiveCandidate(prevState.activeCandidate)
    setShowPartyProfile(prevState.showPartyProfile)
    setActiveParty(prevState.activeParty)
    setShowParticipantProfile(prevState.showParticipantProfile)
    setActiveParticipant(prevState.activeParticipant)
    setIsOwnParticipantProfile(prevState.isOwnParticipantProfile)
  }

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

  const profileOverlayRef = useRef(null)

  const handleOpenProfile = (candidate) => {
    saveToHistory()
    setShowComments(false)
    setShowPartyProfile(false)
    setShowParticipantProfile(false)
    setActiveCandidate(candidate)
    setShowProfile(true)
    // Scroll to top after state update
    setTimeout(() => {
      if (profileOverlayRef.current) {
        profileOverlayRef.current.scrollTo(0, 0)
      }
    }, 0)
  }

  const handleCloseProfile = () => {
    setShowProfile(false)
    setActiveCandidate(null)
  }

  const handleOpenPartyProfile = (partyName) => {
    const partyData = mockPartyProfiles[partyName]
    if (partyData) {
      saveToHistory()
      setShowComments(false)
      setShowProfile(false)
      setShowParticipantProfile(false)
      setActiveParty(partyData)
      setShowPartyProfile(true)
    }
  }

  const handleClosePartyProfile = () => {
    setShowPartyProfile(false)
    setActiveParty(null)
  }

  const handleOpenParticipantProfile = (participant, isOwn = false) => {
    setActiveParticipant(participant)
    setIsOwnParticipantProfile(isOwn)
    setShowParticipantProfile(true)
  }

  const handleCloseParticipantProfile = () => {
    setShowParticipantProfile(false)
    setActiveParticipant(null)
    setIsOwnParticipantProfile(false)
  }

  const handleOptIn = () => {
    // TODO: Handle opt-in to social credit system
    console.log('User opted in to social credit')
    handleCloseParticipantProfile()
  }

  // Handle clicking on a username in comments
  const handleCommentUsernameClick = (comment) => {
    saveToHistory()
    setShowComments(false)

    if (comment.profileType === 'candidate') {
      // Open CandidateProfile for users who opted into social credit
      setActiveCandidate({
        username: comment.username,
        avatar: comment.avatar,
        party: comment.party || 'Independent',
      })
      setShowProfile(true)
    } else {
      // Open ParticipantProfile for users who haven't opted in
      setActiveParticipant({
        username: comment.username,
        avatar: comment.avatar,
        party: comment.party,
        hasOptedIn: false,
      })
      setShowParticipantProfile(true)
    }
  }

  // Handle clicking on a party name in comments
  const handleCommentPartyClick = (partyName) => {
    handleOpenPartyProfile(partyName)
  }

  // Handle clicking on username in reels
  const handleReelUsernameClick = (user) => {
    // For now, treat all reel users as candidates (opted into social credit)
    setActiveCandidate({
      username: user.username,
      avatar: user.avatar,
      party: user.party || 'Independent',
    })
    setShowProfile(true)
  }

  // Handle clicking on party tag in reels
  const handleReelPartyClick = (partyName) => {
    handleOpenPartyProfile(partyName)
  }

  // Handle clicking on engagement score item in reels
  const handleEngagementClick = (score) => {
    // Engagement scores are candidates (on the scoreboard)
    setActiveCandidate({
      username: score.username,
      avatar: score.avatar,
      party: score.party || 'The Pink Lady Party',
    })
    setShowProfile(true)
  }

  const handleNavClick = (page) => {
    const pageIndex = PAGES.indexOf(page)
    if (pageIndex !== -1) {
      setCurrentPage(pageIndex)
      // Clear ballot notification when visiting campaign page
      if (page === 'campaign') {
        setHasBallotNotification(false)
      }
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
          <Scoreboard onOpenProfile={handleOpenProfile} isActive={currentPage === 0} />
        </div>

        {/* Home Page - Now Reels */}
        <div className="page">
          <div className="reels-feed">
            {mockReels.map((reel) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                onOpenComments={() => handleOpenComments(reel)}
                onUsernameClick={handleReelUsernameClick}
                onPartyClick={handleReelPartyClick}
                onEngagementClick={handleEngagementClick}
              />
            ))}
          </div>
        </div>

        {/* Explore/Search Page */}
        <div className="page">
          <ExplorePage />
        </div>

        {/* Messages Page */}
        <div className="page">
          <Messages onConversationChange={setIsInConversation} />
        </div>

        {/* Campaign/Ballot Page */}
        <div className="page">
          <MyBallot onProfileClick={() => setCurrentPage(5)} isActive={currentPage === 4} />
        </div>

        {/* My Profile Page */}
        <div className="page">
          <MyProfile
            onPartyClick={handleOpenPartyProfile}
            onOptIn={handleOptIn}
            userParty={userParty}
          />
        </div>
      </div>

      {!isInConversation && !showCreateScreen && (
        <BottomNav
          currentPage={PAGES[currentPage]}
          onNavigate={handleNavClick}
          onCreateClick={() => setShowCreateScreen(true)}
          theme={PAGES[currentPage] === 'scoreboard' ? 'light' : PAGES[currentPage] === 'campaign' ? 'ballot' : 'dark'}
          notifications={{ messages: 12, campaign: hasBallotNotification ? 1 : 0 }}
        />
      )}

      {/* Create Screen */}
      {showCreateScreen && (
        <div className="create-screen-container">
          <CreateScreen
            onClose={() => setShowCreateScreen(false)}
            onPartyCreated={(partyData) => {
              setUserParty(partyData)
              setShowCreateScreen(false)
            }}
          />
        </div>
      )}

      {/* Comments overlay */}
      {showComments && (
        <CommentsSection
          reel={activeReel}
          onClose={handleCloseComments}
          onUsernameClick={handleCommentUsernameClick}
          onPartyClick={handleCommentPartyClick}
        />
      )}

      {/* Candidate Profile overlay */}
      {showProfile && (
        <div className="profile-overlay" ref={profileOverlayRef}>
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <CandidateProfile
            candidate={activeCandidate}
            onClose={handleCloseProfile}
            onPartyClick={handleOpenPartyProfile}
            onUserClick={handleOpenProfile}
          />
        </div>
      )}

      {/* Party Profile overlay */}
      {showPartyProfile && (
        <div className="profile-overlay">
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <PartyProfile
              party={activeParty}
              onMemberClick={handleOpenProfile}
            />
          </div>
        </div>
      )}

      {/* Participant Profile overlay */}
      {showParticipantProfile && (
        <div className="profile-overlay">
          <button className="back-button" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <ParticipantProfile
              participant={activeParticipant}
              isOwnProfile={isOwnParticipantProfile}
              onPartyClick={handleOpenPartyProfile}
              onOptIn={handleOptIn}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
