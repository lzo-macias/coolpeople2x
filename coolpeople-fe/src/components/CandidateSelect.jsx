import { useState } from 'react'
import '../styling/CandidateSelect.css'

const mockCandidates = [
  { id: 1, name: 'Sarah Chen', party: 'Democrat', avatar: 'https://i.pravatar.cc/100?img=1', isFavorite: true },
  { id: 2, name: 'Marcus Johnson', party: 'Republican', avatar: 'https://i.pravatar.cc/100?img=2', isFavorite: true },
  { id: 3, name: 'Elena Rodriguez', party: null, avatar: 'https://i.pravatar.cc/100?img=3', isFavorite: true },
  { id: 4, name: 'James Wilson', party: 'Green', avatar: 'https://i.pravatar.cc/100?img=4', isFavorite: false },
  { id: 5, name: 'Aisha Patel', party: 'Democrat', avatar: 'https://i.pravatar.cc/100?img=5', isFavorite: false },
  { id: 6, name: 'David Kim', party: 'Republican', avatar: 'https://i.pravatar.cc/100?img=6', isFavorite: false },
  { id: 7, name: 'Maria Santos', party: null, avatar: 'https://i.pravatar.cc/100?img=7', isFavorite: true },
  { id: 8, name: 'Robert Brown', party: 'Democrat', avatar: 'https://i.pravatar.cc/100?img=8', isFavorite: false },
  { id: 9, name: 'Lisa Chang', party: 'Green', avatar: 'https://i.pravatar.cc/100?img=9', isFavorite: false },
  { id: 10, name: 'Michael Davis', party: 'Republican', avatar: 'https://i.pravatar.cc/100?img=10', isFavorite: false },
  { id: 11, name: 'Jennifer Lee', party: 'Democrat', avatar: 'https://i.pravatar.cc/100?img=11', isFavorite: false },
  { id: 12, name: 'Chris Taylor', party: null, avatar: 'https://i.pravatar.cc/100?img=12', isFavorite: false },
]

// Import getPartyColor for consistent party coloring
import { getPartyColor } from '../data/mockData'

function CandidateSelect({ onClose, onSelectCandidate, selectedCandidates = [] }) {
  const [searchQuery, setSearchQuery] = useState('')

  const favorites = mockCandidates.filter(c => c.isFavorite)
  const filteredCandidates = mockCandidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.party || 'Independent').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRanking = (candidateId) => {
    const index = selectedCandidates.findIndex(c => c.id === candidateId)
    return index !== -1 ? index + 1 : null
  }

  const handleSelect = (candidate) => {
    onSelectCandidate(candidate)
  }

  return (
    <div className="candidate-select-page">
      <div className="candidate-select-header">
        <button className="back-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="candidate-select-title">Candidates</h1>
      </div>

      <div className="candidate-search-container">
        <div className="candidate-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="candidate-search-input"
          />
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="favorites-section">
          <h2 className="section-title">My Favorites</h2>
          <div className="favorites-scroll">
            {favorites.map(candidate => {
              const ranking = getRanking(candidate.id)
              return (
                <div
                  key={candidate.id}
                  className={`favorite-item ${ranking ? 'selected' : ''}`}
                  onClick={() => handleSelect(candidate)}
                >
                  <div className="favorite-avatar-container">
                    <div
                      className="favorite-avatar-ring"
                      style={{ borderColor: getPartyColor(candidate.party) }}
                    >
                      <img src={candidate.avatar} alt={candidate.name} className="favorite-avatar" />
                    </div>
                    {ranking && <div className="ranking-badge">{ranking}</div>}
                  </div>
                  <span className="favorite-name">{candidate.name.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="all-candidates-section">
        <h2 className="section-title">All Candidates</h2>
        <div className="candidates-grid">
          {filteredCandidates.map(candidate => {
            const ranking = getRanking(candidate.id)
            return (
              <div
                key={candidate.id}
                className={`candidate-card ${ranking ? 'selected' : ''}`}
                onClick={() => handleSelect(candidate)}
              >
                <div className="candidate-avatar-container">
                  <div
                    className="candidate-avatar-ring"
                    style={{ borderColor: getPartyColor(candidate.party) }}
                  >
                    <img src={candidate.avatar} alt={candidate.name} className="candidate-avatar" />
                  </div>
                  {ranking && <div className="ranking-badge">{ranking}</div>}
                </div>
                <span className="candidate-name">{candidate.name}</span>
                <span className="candidate-party">{candidate.party || 'Independent'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CandidateSelect
