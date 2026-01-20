import { useState } from 'react'
import '../styling/PartySettings.css'

function PartySettings({ party, isAdmin = true, onClose, onSave }) {
  const [activeSection, setActiveSection] = useState(null)
  const [partyData, setPartyData] = useState({
    name: party?.name || 'The Pink Lady Party',
    avatar: party?.avatar || 'https://i.pravatar.cc/150?img=47',
    color: party?.color || '#EC4899',
    description: party?.description || 'A party for the people, by the people.',
    isPrivate: true, // false = public (anyone can join), true = private (must request)
    notifications: true,
  })

  // Mock members data
  const members = [
    { id: 1, username: 'pink_lady', avatar: 'https://i.pravatar.cc/40?img=1', role: 'founder' },
    { id: 2, username: 'sarah.2024', avatar: 'https://i.pravatar.cc/40?img=5', role: 'admin' },
    { id: 3, username: 'mike_politics', avatar: 'https://i.pravatar.cc/40?img=8', role: 'moderator' },
    { id: 4, username: 'jane_votes', avatar: 'https://i.pravatar.cc/40?img=9', role: 'member' },
    { id: 5, username: 'alex_liberty', avatar: 'https://i.pravatar.cc/40?img=12', role: 'member' },
  ]

  // Mock shared media
  const sharedMedia = [
    { id: 1, image: 'https://picsum.photos/200/200?random=1' },
    { id: 2, image: 'https://picsum.photos/200/200?random=2' },
    { id: 3, image: 'https://picsum.photos/200/200?random=3' },
    { id: 4, image: 'https://picsum.photos/200/200?random=4' },
    { id: 5, image: 'https://picsum.photos/200/200?random=5' },
    { id: 6, image: 'https://picsum.photos/200/200?random=6' },
  ]

  // Mock pending requests
  const pendingRequests = [
    { id: 1, username: 'new_member1', avatar: 'https://i.pravatar.cc/40?img=20' },
    { id: 2, username: 'wannajoin', avatar: 'https://i.pravatar.cc/40?img=21' },
    { id: 3, username: 'politics_fan', avatar: 'https://i.pravatar.cc/40?img=22' },
  ]

  const themeColors = [
    '#EC4899', '#FF2A55', '#F59E0B', '#22C55E',
    '#3B82F6', '#8B5CF6', '#00F2EA', '#888888'
  ]

  const renderMainSettings = () => (
    <div className="party-settings-page">
      {/* Header */}
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Party Settings</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Party Avatar & Name */}
      <div className="party-settings-profile">
        <div className="party-settings-avatar-container">
          <img src={partyData.avatar} alt={partyData.name} className="party-settings-avatar" />
          <div className="party-settings-color-ring" style={{ borderColor: partyData.color }} />
        </div>
        <h2 className="party-settings-name">{partyData.name}</h2>
        {isAdmin && (
          <button className="party-settings-edit-link" onClick={() => setActiveSection('edit-profile')}>
            change name or photo
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="party-settings-actions">
        <button className="party-action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
        <button className="party-action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Search</span>
        </button>
        <button className="party-action-btn" onClick={() => setPartyData(prev => ({ ...prev, notifications: !prev.notifications }))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {partyData.notifications ? (
              <>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </>
            ) : (
              <>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                <path d="M18 8a6 6 0 0 0-9.33-5" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
          <span>{partyData.notifications ? 'Mute' : 'Unmute'}</span>
        </button>
        <button className="party-action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span>More</span>
        </button>
      </div>

      {/* Members Section */}
      <div className="party-settings-section">
        <button className="party-settings-row" onClick={() => setActiveSection('members')}>
          <div className="party-settings-row-left">
            <div className="party-members-avatars">
              {members.slice(0, 3).map((member, idx) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.username}
                  className="party-member-mini-avatar"
                  style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx }}
                />
              ))}
            </div>
            <span className="party-settings-row-label">Members</span>
            <span className="party-settings-row-count">{members.length}</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="party-settings-row" onClick={() => setActiveSection('theme')}>
          <div className="party-settings-row-left">
            <div className="party-theme-dot" style={{ background: partyData.color }} />
            <span className="party-settings-row-label">Theme</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button className="party-settings-row" onClick={() => setActiveSection('new-groupchat')}>
          <div className="party-settings-row-left">
            <div className="party-members-avatars">
              {members.slice(0, 2).map((member, idx) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.username}
                  className="party-member-mini-avatar"
                  style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 2 - idx }}
                />
              ))}
            </div>
            <span className="party-settings-row-label">Create a new groupchat</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Admin Settings */}
      {isAdmin && (
        <>
          <p className="party-settings-section-label">Administration</p>
          <div className="party-settings-card">
            <div className="party-settings-row no-hover">
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <div className="party-settings-row-text">
                  <span className="party-settings-row-label">
                    {partyData.isPrivate ? 'Private' : 'Public'}
                  </span>
                  <span className="party-settings-row-sublabel">
                    {partyData.isPrivate ? 'Must request to join' : 'Anyone can join'}
                  </span>
                </div>
              </div>
              <button
                className={`party-toggle ${partyData.isPrivate ? 'active' : ''}`}
                onClick={() => setPartyData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                <span className="party-toggle-knob" />
              </button>
            </div>

            {pendingRequests.length > 0 && (
              <button className="party-settings-row" onClick={() => setActiveSection('requests')}>
                <div className="party-settings-row-left">
                  <span className="party-settings-row-icon accent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </span>
                  <span className="party-settings-row-label">Pending Requests</span>
                </div>
                <div className="party-settings-row-right">
                  <span className="party-settings-badge">{pendingRequests.length}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            )}

            <button className="party-settings-row" onClick={() => setActiveSection('roles')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Roles & Permissions</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('announcements')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Announcements</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('rules')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Party Rules</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('invite-link')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Invite Link</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('banned')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Banned Members</span>
              </div>
              <div className="party-settings-row-right">
                <span className="party-settings-row-count">2</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('moderation')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Moderation Tools</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

          </div>
        </>
      )}

      {/* Links & Content */}
      <p className="party-settings-section-label">Links & Content</p>
      <div className="party-settings-media-grid">
        {sharedMedia.map(media => (
          <div key={media.id} className="party-settings-media-item">
            <img src={media.image} alt="Shared media" />
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="party-settings-danger">
        <button className="party-settings-danger-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Leave Party
        </button>
        {isAdmin && (
          <button className="party-settings-danger-btn delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Party
          </button>
        )}
      </div>
    </div>
  )

  // Render Theme Selection
  const renderThemeSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Theme</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-theme-grid">
        {themeColors.map(color => (
          <button
            key={color}
            className={`party-theme-option ${partyData.color === color ? 'selected' : ''}`}
            style={{ background: color }}
            onClick={() => setPartyData(prev => ({ ...prev, color }))}
          >
            {partyData.color === color && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // Render Members Section
  const renderMembersSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Members</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-members-list">
        {members.map(member => (
          <div key={member.id} className="party-member-item">
            <img src={member.avatar} alt={member.username} className="party-member-avatar" />
            <div className="party-member-info">
              <span className="party-member-username">{member.username}</span>
              <span className="party-member-role">{member.role}</span>
            </div>
            {isAdmin && member.role !== 'founder' && (
              <button className="party-member-action">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // Render Pending Requests
  const renderRequestsSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Pending Requests</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-requests-list">
        {pendingRequests.map(request => (
          <div key={request.id} className="party-request-item">
            <img src={request.avatar} alt={request.username} className="party-member-avatar" />
            <span className="party-member-username">{request.username}</span>
            <div className="party-request-actions">
              <button className="party-request-btn accept">Accept</button>
              <button className="party-request-btn decline">Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Render placeholder sections
  const renderPlaceholder = (title) => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">{title}</h1>
        <div style={{ width: 36 }} />
      </div>
      <div className="party-settings-placeholder">
        <p>Coming soon...</p>
      </div>
    </div>
  )

  return (
    <div className="party-settings">
      {activeSection === null && renderMainSettings()}
      {activeSection === 'theme' && renderThemeSection()}
      {activeSection === 'members' && renderMembersSection()}
      {activeSection === 'requests' && renderRequestsSection()}
      {activeSection === 'edit-profile' && renderPlaceholder('Edit Party')}
      {activeSection === 'roles' && renderPlaceholder('Roles & Permissions')}
      {activeSection === 'announcements' && renderPlaceholder('Announcements')}
      {activeSection === 'rules' && renderPlaceholder('Party Rules')}
      {activeSection === 'new-groupchat' && renderPlaceholder('New Groupchat')}
      {activeSection === 'invite-link' && renderPlaceholder('Invite Link')}
      {activeSection === 'banned' && renderPlaceholder('Banned Members')}
      {activeSection === 'moderation' && renderPlaceholder('Moderation Tools')}
    </div>
  )
}

export default PartySettings
