import { useState } from 'react'
import '../styling/EditProfile.css'
import EditBio from './EditBio'

function EditProfile({ candidate, profileSections, onSave, onClose }) {
  const [activeSection, setActiveSection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editedCandidate, setEditedCandidate] = useState({
    username: candidate?.username || '',
    bio: candidate?.bio || '',
    avatar: candidate?.avatar || '',
    party: candidate?.party || 'Independent',
    status: 'Participant', // or 'Candidate', 'Voter', etc.
  })

  const parties = [
    { name: 'Independent', color: '#888888' },
    { name: 'Democrat', color: '#3B82F6' },
    { name: 'Republican', color: '#EF4444' },
    { name: 'The Pink Lady', color: '#EC4899' },
    { name: 'Green Party', color: '#22C55E' },
    { name: 'Libertarian', color: '#F59E0B' },
  ]

  const statuses = ['Participant', 'Candidate', 'Voter', 'Observer']

  const getPartyColor = (partyName) => {
    const party = parties.find(p => p.name === partyName)
    return party?.color || '#888888'
  }

  // Render main settings menu
  const renderMainMenu = () => (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Settings and Configuration</h1>
      </div>

      {/* Search */}
      <div className="settings-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Profile Picture */}
      <div className="settings-avatar-section">
        <div className="settings-avatar-container">
          {editedCandidate.avatar ? (
            <img src={editedCandidate.avatar} alt="Profile" className="settings-avatar" />
          ) : (
            <div className="settings-avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="12" cy="10" r="3" />
                <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
              </svg>
            </div>
          )}
        </div>
        <button className="edit-picture-link">edit profile picture</button>
      </div>

      {/* Status & Party */}
      <div className="settings-profile-info">
        <button className="settings-row" onClick={() => setActiveSection('status')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">✊</span>
            <span className="settings-row-label">Status</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.status}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        <button className="settings-row" onClick={() => setActiveSection('party')}>
          <div className="settings-row-left">
            <span className="settings-row-icon">👥</span>
            <span className="settings-row-label">Party</span>
          </div>
          <div className="settings-row-right">
            <span className="settings-row-value">{editedCandidate.party}</span>
            <span
              className="party-color-dot"
              style={{ background: getPartyColor(editedCandidate.party) }}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      </div>

      {/* Other User Settings */}
      <div className="settings-section">
        <button className="settings-section-header" onClick={() => setActiveSection('other-settings')}>
          <span>other user settings</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="notification-dot" />
        </button>

        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveSection('saved')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="settings-row-label">Saved</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('blocked')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span className="settings-row-label">Blocked</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('archives')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span className="settings-row-label">Archives</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('notifications')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="settings-row-label">Notifications</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('silenced')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span className="settings-row-label">Silenced</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* CoolPeople Tools */}
      <div className="settings-section">
        <button className="settings-section-header" onClick={() => setActiveSection('cp-tools')}>
          <span>coolpeople tools</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveSection('icebreakers')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="settings-row-label">Icebreakers</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('races')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span className="settings-row-label">My Races</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('nominations')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span className="settings-row-label">My Nominations</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('ballot')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span className="settings-row-label">My Ballot</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Account & Privacy */}
      <div className="settings-section">
        <button className="settings-section-header">
          <span>account & privacy</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveSection('account')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="settings-row-label">Account</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('privacy')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="settings-row-label">Privacy</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="settings-row" onClick={() => setActiveSection('security')}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="settings-row-label">Security</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger">
        <div className="settings-list">
          <button className="settings-row danger" onClick={() => {}}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="settings-row-label">Log Out</span>
            </div>
          </button>

          <button className="settings-row danger delete" onClick={() => {}}>
            <div className="settings-row-left">
              <svg className="settings-row-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span className="settings-row-label">Delete Account</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  // Render Status selection
  const renderStatusSection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Status</h1>
      </div>
      <div className="settings-list selection-list">
        {statuses.map(status => (
          <button
            key={status}
            className={`settings-row selection ${editedCandidate.status === status ? 'selected' : ''}`}
            onClick={() => {
              setEditedCandidate(prev => ({ ...prev, status }))
              setActiveSection(null)
            }}
          >
            <span className="settings-row-label">{status}</span>
            {editedCandidate.status === status && (
              <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // Render Party selection
  const renderPartySection = () => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Party</h1>
      </div>
      <div className="settings-list selection-list">
        {parties.map(party => (
          <button
            key={party.name}
            className={`settings-row selection ${editedCandidate.party === party.name ? 'selected' : ''}`}
            onClick={() => {
              setEditedCandidate(prev => ({ ...prev, party: party.name }))
              setActiveSection(null)
            }}
          >
            <div className="settings-row-left">
              <span className="party-color-dot" style={{ background: party.color }} />
              <span className="settings-row-label">{party.name}</span>
            </div>
            {editedCandidate.party === party.name && (
              <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // Render Icebreakers section
  const renderIcebreakersSection = () => (
    <div className="settings-page icebreakers-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">Icebreakers</h1>
      </div>
      <div className="icebreakers-container">
        <EditBio
          profileData={profileSections}
          onSave={(updatedData) => {
            onSave?.(updatedData)
            setActiveSection(null)
          }}
        />
      </div>
    </div>
  )

  // Render placeholder section
  const renderPlaceholderSection = (title) => (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="settings-title">{title}</h1>
      </div>
      <div className="placeholder-content">
        <p>Coming soon...</p>
      </div>
    </div>
  )

  return (
    <div className="edit-profile">
      {activeSection === null && renderMainMenu()}
      {activeSection === 'status' && renderStatusSection()}
      {activeSection === 'party' && renderPartySection()}
      {activeSection === 'icebreakers' && renderIcebreakersSection()}
      {activeSection === 'saved' && renderPlaceholderSection('Saved')}
      {activeSection === 'blocked' && renderPlaceholderSection('Blocked')}
      {activeSection === 'archives' && renderPlaceholderSection('Archives')}
      {activeSection === 'notifications' && renderPlaceholderSection('Notifications')}
      {activeSection === 'silenced' && renderPlaceholderSection('Silenced')}
      {activeSection === 'races' && renderPlaceholderSection('My Races')}
      {activeSection === 'nominations' && renderPlaceholderSection('My Nominations')}
      {activeSection === 'ballot' && renderPlaceholderSection('My Ballot')}
      {activeSection === 'account' && renderPlaceholderSection('Account')}
      {activeSection === 'privacy' && renderPlaceholderSection('Privacy')}
      {activeSection === 'security' && renderPlaceholderSection('Security')}
    </div>
  )
}

export default EditProfile
