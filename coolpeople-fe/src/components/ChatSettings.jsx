import { useState } from 'react'
import { getPartyColor } from '../data/mockData'
import '../styling/ChatSettings.css'

function ChatSettings({ chat, isGroupChat = false, onClose }) {
  const [activeSection, setActiveSection] = useState(null)

  // Get party color - gray for independent, party color otherwise
  const partyColor = getPartyColor(chat?.party)

  const [chatData, setChatData] = useState({
    name: chat?.name || chat?.username || 'Chat',
    avatar: chat?.avatar || 'https://i.pravatar.cc/150?img=47',
    color: partyColor,
    notifications: true,
  })

  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [sentToUsers, setSentToUsers] = useState([])
  const [unsentUsers, setUnsentUsers] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Mock members data (for group chats)
  const members = isGroupChat ? [
    { id: 1, username: chat?.name || 'user1', avatar: chat?.avatar || 'https://i.pravatar.cc/40?img=1', isOwner: true },
    { id: 2, username: 'sarah.2024', avatar: 'https://i.pravatar.cc/40?img=5', isOwner: false },
    { id: 3, username: 'mike_politics', avatar: 'https://i.pravatar.cc/40?img=8', isOwner: false },
  ] : [
    { id: 1, username: chat?.name || chat?.username || 'User', avatar: chat?.avatar || 'https://i.pravatar.cc/40?img=1', isOwner: false },
  ]

  // Tab state for Links & Content
  const [activeMediaTab, setActiveMediaTab] = useState('links')

  // Shared links - empty for now, will be populated from API
  const sharedLinks = []

  // Shared content - empty for now, will be populated from API
  const sharedContent = []

  // Mock connected users for sharing
  const connectedUsers = [
    { id: 101, username: 'emma_davis', avatar: 'https://i.pravatar.cc/40?img=25' },
    { id: 102, username: 'james.wilson', avatar: 'https://i.pravatar.cc/40?img=33' },
    { id: 103, username: 'olivia_martinez', avatar: 'https://i.pravatar.cc/40?img=44' },
    { id: 104, username: 'noah_brown', avatar: 'https://i.pravatar.cc/40?img=52' },
    { id: 105, username: 'ava.johnson', avatar: 'https://i.pravatar.cc/40?img=38' },
    { id: 106, username: 'liam_garcia', avatar: 'https://i.pravatar.cc/40?img=59' },
  ]

  const themeColors = [
    '#EC4899', '#FF2A55', '#F59E0B', '#22C55E',
    '#3B82F6', '#8B5CF6', '#00F2EA', '#888888'
  ]

  const renderMainSettings = () => (
    <div className="chat-settings-page">
      {/* Header */}
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">{isGroupChat ? 'Group Settings' : 'Chat Settings'}</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Avatar & Name */}
      <div className="chat-settings-profile">
        <div className="chat-settings-avatar-container">
          <img src={chatData.avatar} alt={chatData.name} className="chat-settings-avatar" />
          <div className="chat-settings-color-ring" style={{ borderColor: chatData.color }} />
        </div>
        <h2 className="chat-settings-name">{chatData.name}</h2>
        {isGroupChat && (
          <button className="chat-settings-edit-link" onClick={() => setActiveSection('edit-profile')}>
            change name or photo
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="chat-settings-actions">
        <button className="chat-action-btn" onClick={() => setShowShareMenu(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
        <button className="chat-action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Search</span>
        </button>
        <button className="chat-action-btn" onClick={() => setChatData(prev => ({ ...prev, notifications: !prev.notifications }))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {chatData.notifications ? (
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
          <span>{chatData.notifications ? 'Mute' : 'Unmute'}</span>
        </button>
        <button className="chat-action-btn" onClick={() => setShowMoreMenu(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span>More</span>
        </button>
      </div>

      {/* Share Menu Popup */}
      {showShareMenu && (
        <div className="chat-more-overlay" onClick={() => setShowShareMenu(false)}>
          <div className="chat-share-menu" onClick={e => e.stopPropagation()}>
            <button className="chat-more-option" onClick={() => { setShowShareMenu(false); setActiveSection('send-to-users'); }}>
              <div className="chat-share-avatars">
                {connectedUsers.slice(0, 3).map((user, idx) => (
                  <img
                    key={user.id}
                    src={user.avatar}
                    alt=""
                    className="chat-share-mini-avatar"
                    style={{ marginLeft: idx > 0 ? -6 : 0, zIndex: 3 - idx }}
                  />
                ))}
              </div>
              Users
            </button>
            <button className="chat-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy Link
            </button>
            <div className="chat-share-divider" />
            <button className="chat-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Message
            </button>
          </div>
        </div>
      )}

      {/* More Menu Popup */}
      {showMoreMenu && (
        <div className="chat-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="chat-more-menu" onClick={e => e.stopPropagation()}>
            {isGroupChat && (
              <button className="chat-more-option">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Leave Group
              </button>
            )}
            <button className="chat-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Hide Chat
            </button>
            <button className="chat-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Block
            </button>
            <button className="chat-more-option danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Report
            </button>
            <button className="chat-more-option danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete Chat
            </button>
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="chat-settings-section">
        <button className="chat-settings-row" onClick={() => setActiveSection('members')}>
          <div className="chat-settings-row-left">
            <div className="chat-members-avatars">
              {members.slice(0, 3).map((member, idx) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.username}
                  className="chat-member-mini-avatar"
                  style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx }}
                />
              ))}
            </div>
            <span className="chat-settings-row-label">{isGroupChat ? 'Members' : 'View Profile'}</span>
            {isGroupChat && <span className="chat-settings-row-count">{members.length}</span>}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-settings-chevron">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Theme row hidden for now
        <button className="chat-settings-row" onClick={() => setActiveSection('theme')}>
          <div className="chat-settings-row-left">
            <div className="chat-theme-dot" style={{ background: chatData.color }} />
            <span className="chat-settings-row-label">Theme</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-settings-chevron">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        */}

        {isGroupChat && (
          <button className="chat-settings-row" onClick={() => setActiveSection('add-members')}>
            <div className="chat-settings-row-left">
              <span className="chat-settings-row-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </span>
              <span className="chat-settings-row-label">Add Members</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-settings-chevron">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Links & Content */}
      <p className="chat-settings-section-label">Links & Content</p>
      <div className="chat-settings-media-tabs">
        <button
          className={`chat-settings-media-tab ${activeMediaTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveMediaTab('links')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button
          className={`chat-settings-media-tab ${activeMediaTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveMediaTab('content')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="chat-settings-media-content">
        {activeMediaTab === 'links' && (
          sharedLinks.length > 0 ? (
            <div className="chat-settings-links-list">
              {sharedLinks.map(link => (
                <a key={link.id} href={link.url} className="chat-settings-link-item">
                  {link.title}
                </a>
              ))}
            </div>
          ) : (
            <div className="chat-settings-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <p>No links shared yet</p>
            </div>
          )
        )}

        {activeMediaTab === 'content' && (
          sharedContent.length > 0 ? (
            <div className="chat-settings-media-grid">
              {sharedContent.map(media => (
                <div key={media.id} className="chat-settings-media-item">
                  <img src={media.image} alt="Shared media" />
                </div>
              ))}
            </div>
          ) : (
            <div className="chat-settings-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>No content shared yet</p>
            </div>
          )
        )}
      </div>
    </div>
  )

  // Render Theme Selection
  const renderThemeSection = () => (
    <div className="chat-settings-page">
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">Theme</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="chat-theme-grid">
        {themeColors.map(color => (
          <button
            key={color}
            className={`chat-theme-option ${chatData.color === color ? 'selected' : ''}`}
            style={{ background: color }}
            onClick={() => setChatData(prev => ({ ...prev, color }))}
          >
            {chatData.color === color && (
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
  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  )

  const renderMembersSection = () => (
    <div className="chat-settings-page">
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={() => { setActiveSection(null); setMemberSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">{isGroupChat ? 'Members' : 'Profile'}</h1>
        <div style={{ width: 36 }} />
      </div>

      {isGroupChat && (
        <div className="chat-send-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search members..."
            className="chat-send-search-input"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="chat-members-list">
        {filteredMembers.map(member => (
          <div key={member.id} className="chat-member-item">
            <img src={member.avatar} alt={member.username} className="chat-member-avatar" />
            <div className="chat-member-info">
              <span className="chat-member-username">{member.username}</span>
              {member.isOwner && <span className="chat-member-role">Owner</span>}
            </div>
            {isGroupChat && !member.isOwner && (
              <div className="chat-member-actions">
                <button className="chat-member-action-btn" title="Remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // Render Send to Users Section
  const toggleSentToUser = (userId) => {
    const isSent = sentToUsers.includes(userId)
    const isUnsent = unsentUsers.includes(userId)

    if (isSent) {
      setSentToUsers(prev => prev.filter(id => id !== userId))
      setUnsentUsers(prev => [...prev, userId])
    } else {
      setSentToUsers(prev => [...prev, userId])
      setUnsentUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const filteredUsers = connectedUsers.filter(user =>
    user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const renderSendToUsersSection = () => (
    <div className="chat-settings-page">
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">Send To</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="chat-send-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          className="chat-send-search-input"
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
        />
      </div>

      <div className="chat-send-list">
        {filteredUsers.map(user => {
          const isSent = sentToUsers.includes(user.id)
          const isUnsent = unsentUsers.includes(user.id)
          let buttonText = 'Send'
          if (isSent) buttonText = 'Sent'
          else if (isUnsent) buttonText = 'Unsent'

          return (
            <div key={user.id} className="chat-send-item">
              <img src={user.avatar} alt={user.username} className="chat-send-avatar" />
              <span className="chat-send-username">{user.username}</span>
              <button
                className={`chat-send-status-btn ${isSent ? 'sent' : ''}`}
                onClick={() => toggleSentToUser(user.id)}
              >
                {buttonText}
              </button>
            </div>
          )
        })}
      </div>

      <button
        className={`chat-done-btn ${sentToUsers.length > 0 ? 'active' : ''}`}
        onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}
      >
        Done
      </button>
    </div>
  )

  // Render Add Members Section
  const renderAddMembersSection = () => (
    <div className="chat-settings-page">
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">Add Members</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="chat-send-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          className="chat-send-search-input"
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
        />
      </div>

      <div className="chat-send-list">
        {filteredUsers.map(user => {
          const isAdded = sentToUsers.includes(user.id)

          return (
            <div key={user.id} className="chat-send-item">
              <img src={user.avatar} alt={user.username} className="chat-send-avatar" />
              <span className="chat-send-username">{user.username}</span>
              <button
                className={`chat-send-status-btn ${isAdded ? 'sent' : ''}`}
                onClick={() => toggleSentToUser(user.id)}
              >
                {isAdded ? 'Added' : 'Add'}
              </button>
            </div>
          )
        })}
      </div>

      <button
        className={`chat-done-btn ${sentToUsers.length > 0 ? 'active' : ''}`}
        onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}
      >
        Done
      </button>
    </div>
  )

  // Render placeholder sections
  const renderPlaceholder = (title) => (
    <div className="chat-settings-page">
      <div className="chat-settings-header">
        <button className="chat-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="chat-settings-title">{title}</h1>
        <div style={{ width: 36 }} />
      </div>
      <div className="chat-settings-placeholder">
        <p>Coming soon...</p>
      </div>
    </div>
  )

  return (
    <div className="chat-settings">
      {activeSection === null && renderMainSettings()}
      {activeSection === 'theme' && renderThemeSection()}
      {activeSection === 'members' && renderMembersSection()}
      {activeSection === 'edit-profile' && renderPlaceholder('Edit Group')}
      {activeSection === 'add-members' && renderAddMembersSection()}
      {activeSection === 'send-to-users' && renderSendToUsersSection()}
    </div>
  )
}

export default ChatSettings
