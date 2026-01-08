import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../styling/MyBallot.css'
// import BouncingBallotGraphic from './BouncingBallotGraphic'
import BallotIntro from './BouncingBallotNew'

const races = [
  { id: 1, name: 'Global', slots: 8 },
  { id: 2, name: 'Local', slots: 6 },
  { id: 3, name: 'The Pink Lady', slots: 5 },
]

// Sample names for candidates
const firstNames = ['James', 'Mary', 'John', 'Sarah', 'Michael', 'Emma', 'David', 'Olivia', 'Chris', 'Sophia', 'Daniel', 'Ava', 'Matthew', 'Isabella', 'Andrew', 'Mia', 'Joshua', 'Charlotte', 'Ethan', 'Amelia', 'Alex', 'Harper', 'Ryan', 'Evelyn', 'Brandon', 'Abigail', 'Tyler', 'Emily', 'Kevin', 'Elizabeth', 'Jason', 'Sofia', 'Justin', 'Avery', 'Aaron', 'Ella', 'Adam', 'Scarlett', 'Nathan', 'Grace']

// Generate candidates for a page (64 per page)
const generateCandidates = (page) => {
  const startId = page * 64
  return Array.from({ length: 64 }, (_, i) => {
    const id = startId + i + 1
    const imgIndex = ((id - 1) % 70) + 1 // pravatar has ~70 images
    const nameIndex = (id - 1) % firstNames.length
    return {
      id,
      avatar: `https://i.pravatar.cc/80?img=${imgIndex}`,
      name: firstNames[nameIndex],
      isFavorite: [3, 7, 12, 19, 25, 38, 45, 52, 67, 78, 89, 95, 102, 115].includes(i),
    }
  })
}

function MyBallot({ onProfileClick, isActive }) {
  const [splashStarted, setSplashStarted] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [splashFading, setSplashFading] = useState(false)
  const hasShownSplash = useRef(false)
  const [currentRace, setCurrentRace] = useState(0)
  const [rankings, setRankings] = useState({}) // { raceId: [candidateId1, candidateId2, ...] }
  const [showCandidateSelect, setShowCandidateSelect] = useState(false)
  const [candidates, setCandidates] = useState(() => generateCandidates(0))
  const [page, setPage] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [countdown, setCountdown] = useState({
    days: 2,
    hours: 13,
    minutes: 3,
    seconds: 32
  })

  // Start splash only when tab becomes active for the first time
  useEffect(() => {
    if (isActive && !hasShownSplash.current) {
      hasShownSplash.current = true
      setSplashStarted(true)
      setShowSplash(true)
    }
  }, [isActive])

  // Splash screen animation sequence - let BallotIntro handle its own phases
  useEffect(() => {
    if (splashStarted && showSplash && !splashFading) {
      // Start fade after BallotIntro finishes (balls: 0-2s, text: 2-4s)
      const fadeTimer = setTimeout(() => {
        setSplashFading(true)
      }, 4500)

      return () => clearTimeout(fadeTimer)
    }
  }, [splashStarted, showSplash, splashFading])

  // Hide splash after fade completes
  useEffect(() => {
    if (splashFading) {
      const hideTimer = setTimeout(() => {
        setShowSplash(false)
      }, 800) // Match CSS transition duration

      return () => clearTimeout(hideTimer)
    }
  }, [splashFading])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { days, hours, minutes, seconds } = prev
        seconds--
        if (seconds < 0) { seconds = 59; minutes-- }
        if (minutes < 0) { minutes = 59; hours-- }
        if (hours < 0) { hours = 23; days-- }
        if (days < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
        return { days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const pad = (num) => String(num).padStart(2, '0')
  const race = races[currentRace]
  const currentRankings = rankings[race.id] || []

  const handleNextPage = () => {
    const newPage = page + 1
    setPage(newPage)
    setCandidates(generateCandidates(newPage))
  }

  const handlePrevPage = () => {
    if (page > 0) {
      const newPage = page - 1
      setPage(newPage)
      setCandidates(generateCandidates(newPage))
    }
  }

  const handleSelectCandidate = (candidateId) => {
    const raceId = race.id
    const current = rankings[raceId] || []
    const candidate = candidates.find(c => c.id === candidateId)

    if (!candidate?.avatar) return // Can't select empty slots

    const existingIndex = current.indexOf(candidateId)

    if (existingIndex !== -1) {
      // Remove from rankings
      const updated = current.filter(id => id !== candidateId)
      setRankings({ ...rankings, [raceId]: updated })
    } else if (current.length < race.slots) {
      // Add to rankings
      setRankings({ ...rankings, [raceId]: [...current, candidateId] })
    }
  }

  const getRanking = (candidateId) => {
    const index = currentRankings.indexOf(candidateId)
    return index !== -1 ? index + 1 : null
  }

  const openCandidateSelect = () => {
    setShowCandidateSelect(true)
  }

  const closeCandidateSelect = () => {
    setShowCandidateSelect(false)
  }

  const clearAllRankings = () => {
    setRankings({ ...rankings, [race.id]: [] })
  }

  const goToNextRace = () => {
    if (currentRace < races.length - 1) {
      setCurrentRace(currentRace + 1)
      setShowCandidateSelect(false)
    }
  }

  const handleDragStart = (e, index) => {
    if (!currentRankings[index]) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newRankings = [...currentRankings]
    const draggedItem = newRankings[draggedIndex]

    // Remove from old position
    newRankings.splice(draggedIndex, 1)
    // Insert at new position
    newRankings.splice(dropIndex, 0, draggedItem)

    setRankings({ ...rankings, [race.id]: newRankings })
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Show blank screen until tab is activated, then show splash
  if (!splashStarted) {
    return (
      <div className="ballot-splash" />
    )
  }

  // Splash screen - BallotIntro handles its own phase transitions
  if (showSplash) {
    return (
      <div className={`ballot-splash ${splashFading ? 'fading' : ''}`}>
        <BallotIntro />
      </div>
    )
  }

  return (
    <div className="ballot-page">
      <div className="ballot-top-bar">
        <div className="top-bar-left">
          {showCandidateSelect && (
            <button className="back-to-ballot-btn" onClick={closeCandidateSelect}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        <img
          src="/icons/userprofile.svg"
          alt="Profile"
          className="profile-icon"
          onClick={onProfileClick}
        />
      </div>
      <div className="ballot-accent-line" />

      <div className="ballot-header">
        <div>
          <h1 className="ballot-title">Your Ballot</h1>
          <p className="ballot-subtitle">Ranked Choice Voting</p>
        </div>
        <div className="ballot-counter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>0/3</span>
        </div>
      </div>

      <div className="ballot-countdown">
        <div className="countdown-item">
          <span className="countdown-number">{pad(countdown.days)}</span>
          <span className="countdown-label">DAYS</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-number">{pad(countdown.hours)}</span>
          <span className="countdown-label">HRS</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-number">{pad(countdown.minutes)}</span>
          <span className="countdown-label">MIN</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-number">{pad(countdown.seconds)}</span>
          <span className="countdown-label">SEC</span>
        </div>
      </div>

      <div className="ballot-dots">
        {races.map((_, i) => (
          <span
            key={i}
            className={`ballot-dot ${currentRace === i ? 'active' : ''}`}
            onClick={() => setCurrentRace(i)}
          />
        ))}
      </div>

      {!showCandidateSelect ? (
        <div className="race-card">
          <div className="race-header">
            <span className="race-label">RACE {race.id} OF {races.length}</span>
            <button className="see-candidates" onClick={openCandidateSelect}>see all candidates</button>
          </div>
          <h2 className="race-name">{race.name}</h2>
          <p className="race-instructions">
            Your Ranking <span className="highlight">• Tap or drag to rank</span>
          </p>

          <div className="ranking-slots">
            {Array.from({ length: race.slots }, (_, i) => {
              const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][i]
              const candidateId = currentRankings[i]
              const candidate = candidateId ? candidates.find(c => c.id === candidateId) : null
              return (
              <div
                key={i}
                className={`ranking-slot ${candidate ? 'filled' : ''} ${draggedIndex === i ? 'dragging' : ''}`}
                draggable={!!candidate}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onClick={() => !candidate && openCandidateSelect()}
              >
                <div className="slot-number">{i + 1}</div>
                {candidate ? (
                  <div className="slot-candidate">
                    <img src={candidate.avatar} alt={candidate.name} className="slot-avatar" />
                    <span className="slot-name">{candidate.name}</span>
                  </div>
                ) : (
                  <span className="slot-placeholder" onClick={openCandidateSelect}>{ordinal} choice</span>
                )}
                <div className="slot-handle">
                  <span /><span /><span /><span />
                </div>
              </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="candidate-select-instructions">
            <div className="search-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <p className="instructions-text">
              <strong>Tap</strong> to rank <span className="highlight">• Hold</span> to preview
            </p>
          </div>
          <div className="candidate-select-card">
            {page > 0 && (
              <button className="page-arrow page-arrow-up" onClick={handlePrevPage}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
            )}
            <div className="candidates-grid">
              {candidates.map((candidate) => {
                const ranking = getRanking(candidate.id)
                return (
                  <div
                    key={candidate.id}
                    className={`candidate-item ${ranking ? 'selected' : ''}`}
                    onClick={() => handleSelectCandidate(candidate.id)}
                  >
                    <div className="candidate-circle">
                      <img src={candidate.avatar} alt={candidate.name} className="candidate-avatar" />
                      {ranking && <div className="ranking-badge">{ranking}</div>}
                      {candidate.isFavorite && <img src="/icons/myballot/favorited-candidate.svg" alt="Favorited" className="favorite-star" />}
                    </div>
                    <span className="candidate-name">{candidate.name}</span>
                  </div>
                )
              })}
            </div>
            <button className="page-arrow page-arrow-down" onClick={handleNextPage}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </>
      )}

      {showCandidateSelect && currentRankings.length > 0 && createPortal(
        <div className="ranking-panel">
          <div className="ranking-panel-header">
            <div className="ranking-panel-title-group">
              <span className="ranking-panel-title">YOUR RANKING</span>
              <span className="ranking-panel-hint">You don't have to fill out all {race.slots} slots</span>
            </div>
            <button className="clear-all-btn" onClick={clearAllRankings}>Clear all</button>
          </div>
          <div className="ranking-panel-slots">
            {Array.from({ length: race.slots }, (_, i) => {
              const candidateId = currentRankings[i]
              const candidate = candidateId ? candidates.find(c => c.id === candidateId) : null
              return (
                <div key={i} className={`ranking-panel-slot ${candidate ? 'filled' : ''}`}>
                  {candidate ? (
                    <>
                      <img src={candidate.avatar} alt={candidate.name} className="ranking-panel-avatar" />
                      <div className="ranking-panel-badge">{i + 1}</div>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
          <button className="next-race-btn" onClick={closeCandidateSelect}>
            Ballot Complete →
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

export default MyBallot
