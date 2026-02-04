import { useState, useEffect } from 'react'
import { messagesApi, partiesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import '../styling/PartySettings.css'

function PartySettings({ party, isAdmin = true, onClose, onSave, conversation, onSettingsChange, onLeave, onCreateGroupChat, onOpenProfile }) {
  const { user: currentUser } = useAuth()
  const [activeSection, setActiveSection] = useState(null)
  const [members, setMembers] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Convert permissions array to display role
  const permissionsToRole = (permissions) => {
    if (permissions.includes('leader')) return 'founder'
    if (permissions.includes('admin')) return 'admin'
    if (permissions.includes('moderate')) return 'moderator'
    return 'member'
  }

  // Fetch real members from API
  useEffect(() => {
    const fetchMembers = async () => {
      const partyId = conversation?.partyId
      if (!partyId) return

      setIsLoadingMembers(true)
      try {
        const response = await partiesApi.getMembers(partyId)
        // API returns { data: [...members...] } where each member has: userId, username, displayName, avatarUrl, permissions
        if (response.data && Array.isArray(response.data)) {
          const transformedMembers = response.data.map(member => ({
            id: member.userId,
            username: member.username || member.displayName || 'Member',
            avatar: member.avatarUrl || 'https://i.pravatar.cc/40',
            role: permissionsToRole(member.permissions || []),
          }))
          setMembers(transformedMembers)
        }
      } catch (error) {
        console.error('Failed to fetch members:', error)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    fetchMembers()
  }, [conversation?.partyId])

  // Fetch banned members from API (only for admins)
  useEffect(() => {
    const fetchBannedMembers = async () => {
      const partyId = conversation?.partyId
      if (!partyId || !isAdmin) return

      setIsLoadingBanned(true)
      try {
        const response = await partiesApi.getBannedMembers(partyId)
        if (response.data && Array.isArray(response.data)) {
          const transformedBanned = response.data.map(ban => ({
            id: ban.userId,
            username: ban.username || ban.displayName || 'User',
            avatar: ban.avatarUrl || 'https://i.pravatar.cc/40',
            bannedDate: new Date(ban.bannedAt).toLocaleDateString(),
          }))
          setBannedUsers(transformedBanned)
        }
      } catch (error) {
        console.error('Failed to fetch banned members:', error)
      } finally {
        setIsLoadingBanned(false)
      }
    }

    fetchBannedMembers()
  }, [conversation?.partyId, isAdmin])

  const [partyData, setPartyData] = useState({
    name: party?.name || 'The Pink Lady Party',
    avatar: party?.avatar || 'https://i.pravatar.cc/150?img=47',
    color: party?.color || '#EC4899',
    description: party?.description || 'A party for the people, by the people.',
    isPrivate: party?.isPrivate ?? false, // Read from backend: false = public, true = private
    notifications: !conversation?.isMuted, // Initialize from conversation settings
  })

  // Handle mute/unmute with API call
  const handleToggleMute = async () => {
    const partyId = conversation?.partyId
    if (!partyId) return

    const newMutedState = partyData.notifications // notifications=true means NOT muted, so toggling means mute
    try {
      if (newMutedState) {
        await messagesApi.muteConversation(partyId)
      } else {
        await messagesApi.unmuteConversation(partyId)
      }
      setPartyData(prev => ({ ...prev, notifications: !prev.notifications }))
      // Notify parent of the change
      if (onSettingsChange) {
        onSettingsChange({ isMuted: newMutedState })
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error)
    }
  }

  // Handle hide with API call
  const handleHide = async () => {
    const partyId = conversation?.partyId
    if (!partyId) return

    try {
      await messagesApi.hideConversation(partyId)
      if (onSettingsChange) {
        onSettingsChange({ isHidden: true })
      }
      onClose() // Close settings after hiding
    } catch (error) {
      console.error('Failed to hide conversation:', error)
    }
  }

  const [adminPermissions, setAdminPermissions] = useState({
    acceptRequests: true,
    blockMembers: true,
    silenceMembers: true,
    deleteMessages: true,
    pinMessages: true,
    editPartyInfo: false,
    promoteAdmins: false,
    changeTheme: false,
    enterRaces: true,
  })

  const [chatSettings, setChatSettings] = useState({
    adminsOnly: false,
    cycleEnabled: true,
  })

  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [sentToUsers, setSentToUsers] = useState([])
  const [unsentUsers, setUnsentUsers] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [silencedMembers, setSilencedMembers] = useState([])
  const [memberRoles, setMemberRoles] = useState({})
  const [bannedSearchQuery, setBannedSearchQuery] = useState('')
  const [bannedUsers, setBannedUsers] = useState([])
  const [isLoadingBanned, setIsLoadingBanned] = useState(false)
  const [groupChatSearchQuery, setGroupChatSearchQuery] = useState('')
  const [selectedGroupChatMembers, setSelectedGroupChatMembers] = useState([])

  const togglePermission = (key) => {
    setAdminPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

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

  // Mock connected users (friends/followers)
  const connectedUsers = [
    { id: 101, username: 'emma_davis', avatar: 'https://i.pravatar.cc/40?img=25' },
    { id: 102, username: 'james.wilson', avatar: 'https://i.pravatar.cc/40?img=33' },
    { id: 103, username: 'olivia_martinez', avatar: 'https://i.pravatar.cc/40?img=44' },
    { id: 104, username: 'noah_brown', avatar: 'https://i.pravatar.cc/40?img=52' },
    { id: 105, username: 'ava.johnson', avatar: 'https://i.pravatar.cc/40?img=38' },
    { id: 106, username: 'liam_garcia', avatar: 'https://i.pravatar.cc/40?img=59' },
    { id: 107, username: 'sophia.lee', avatar: 'https://i.pravatar.cc/40?img=23' },
    { id: 108, username: 'mason_clark', avatar: 'https://i.pravatar.cc/40?img=67' },
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
        <button className="party-action-btn" onClick={() => setShowShareMenu(true)}>
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
        <button className="party-action-btn" onClick={handleToggleMute}>
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
        <button className="party-action-btn" onClick={() => setShowMoreMenu(true)}>
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
        <div className="party-more-overlay" onClick={() => setShowShareMenu(false)}>
          <div className="party-share-menu" onClick={e => e.stopPropagation()}>
            <button className="party-more-option" onClick={() => { setShowShareMenu(false); setActiveSection('send-to-users'); }}>
              <div className="party-share-avatars">
                {connectedUsers.slice(0, 3).map((user, idx) => (
                  <img
                    key={user.id}
                    src={user.avatar}
                    alt=""
                    className="party-share-mini-avatar"
                    style={{ marginLeft: idx > 0 ? -6 : 0, zIndex: 3 - idx }}
                  />
                ))}
              </div>
              Users
            </button>
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy Link
            </button>
            <div className="party-share-divider" />
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Message
            </button>
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                <circle cx="18.406" cy="5.594" r="1.44"/>
              </svg>
              Instagram
            </button>
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm5.14 14.83l-.15.14-.41.25a5.93 5.93 0 0 1-3.08.78 6.54 6.54 0 0 1-1.44-.17 6.84 6.84 0 0 1-1.81-.7 7.5 7.5 0 0 1-1.35-1 8.73 8.73 0 0 1-1.21-1.34 8.08 8.08 0 0 1-.88-1.51 7.36 7.36 0 0 1-.52-1.62A6.73 6.73 0 0 1 6.14 10a6.41 6.41 0 0 1 .29-1.86 5.7 5.7 0 0 1 .83-1.65 4.58 4.58 0 0 1 1.29-1.19 3.45 3.45 0 0 1 1.66-.52 2.13 2.13 0 0 1 1.14.33 4.84 4.84 0 0 1 .91.79l.6-.87a.39.39 0 0 1 .34-.16h1.18a.22.22 0 0 1 .19.08.21.21 0 0 1 0 .2l-1.7 4.83a2.46 2.46 0 0 0-.14.65.79.79 0 0 0 .17.52.54.54 0 0 0 .44.2 1.27 1.27 0 0 0 .66-.22 2.47 2.47 0 0 0 .63-.57 3.48 3.48 0 0 0 .49-.82 6.9 6.9 0 0 0 .35-1 7.77 7.77 0 0 0 .21-1.07 8 8 0 0 0 .07-1 5.44 5.44 0 0 0-.47-2.31 4.9 4.9 0 0 0-1.27-1.7 5.54 5.54 0 0 0-1.87-1 7 7 0 0 0-2.26-.36 6.27 6.27 0 0 0-2.66.56 6.49 6.49 0 0 0-2.07 1.5 6.76 6.76 0 0 0-1.35 2.17 7 7 0 0 0-.48 2.58 7.26 7.26 0 0 0 .6 3 7.13 7.13 0 0 0 1.62 2.35 7.36 7.36 0 0 0 2.36 1.54 7.28 7.28 0 0 0 2.83.55 6.32 6.32 0 0 0 2-.31 7.39 7.39 0 0 0 1.74-.82.25.25 0 0 1 .35.05l.63.83a.23.23 0 0 1-.04.31z"/>
              </svg>
              Snapchat
            </button>
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button className="party-more-option">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </button>
          </div>
        </div>
      )}

      {/* More Menu Popup */}
      {showMoreMenu && (
        <div className="party-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="party-more-menu" onClick={e => e.stopPropagation()}>
            <button className="party-more-option" onClick={() => { setShowMoreMenu(false); handleLeaveParty(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave
            </button>
            <button className="party-more-option" onClick={handleHide}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Hide
            </button>
            <button className="party-more-option danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Report
            </button>
          </div>
        </div>
      )}

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

            <button className="party-settings-row" onClick={() => setActiveSection('administrative')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Admin Settings</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="party-settings-chevron">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="party-settings-row" onClick={() => setActiveSection('chat-settings')}>
              <div className="party-settings-row-left">
                <span className="party-settings-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="party-settings-row-label">Chat Settings</span>
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
  const partyId = conversation?.partyId

  // Silence member - removes chat permission
  const toggleSilenceMember = async (memberId) => {
    if (!partyId) return

    const isSilenced = silencedMembers.includes(memberId)
    try {
      if (isSilenced) {
        // Unsilence - add chat permission back
        await partiesApi.updateMemberPermissions(partyId, memberId, ['view', 'chat'])
        setSilencedMembers(prev => prev.filter(id => id !== memberId))
      } else {
        // Silence - remove chat permission
        await partiesApi.updateMemberPermissions(partyId, memberId, ['view'])
        setSilencedMembers(prev => [...prev, memberId])
      }
    } catch (error) {
      console.error('Failed to toggle silence:', error)
    }
  }

  // Promote member to admin
  const promoteMember = async (memberId) => {
    if (!partyId) return

    try {
      await partiesApi.updateMemberPermissions(partyId, memberId, ['view', 'chat', 'post', 'invite', 'moderate', 'admin'])
      // Update local state to reflect new role
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: 'admin' } : m
      ))
    } catch (error) {
      console.error('Failed to promote member:', error)
    }
  }

  // Demote admin to member
  const demoteMember = async (memberId) => {
    if (!partyId) return

    try {
      await partiesApi.updateMemberPermissions(partyId, memberId, ['view', 'chat'])
      // Update local state to reflect new role
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: 'member' } : m
      ))
    } catch (error) {
      console.error('Failed to demote member:', error)
    }
  }

  // Block/ban member from party
  const blockMember = async (memberId) => {
    if (!partyId) return

    try {
      // Get the member info before banning for the banned list
      const memberToBan = members.find(m => m.id === memberId)

      await partiesApi.banMember(partyId, memberId)

      // Remove from members list
      setMembers(prev => prev.filter(m => m.id !== memberId))

      // Add to banned users list
      if (memberToBan) {
        setBannedUsers(prev => [...prev, {
          id: memberToBan.id,
          username: memberToBan.username,
          avatar: memberToBan.avatar,
          bannedDate: new Date().toLocaleDateString(),
        }])
      }
    } catch (error) {
      console.error('Failed to ban member:', error)
    }
  }

  // Leave party
  const handleLeaveParty = async () => {
    if (!partyId) return

    try {
      await partiesApi.leaveParty(partyId)
      onClose() // Close the settings panel
      // Navigate back after leaving
      if (onLeave) {
        onLeave()
      }
    } catch (error) {
      console.error('Failed to leave party:', error)
    }
  }

  const getMemberRole = (member) => {
    return memberRoles[member.id] || member.role
  }

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  )

  const renderMembersSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => { setActiveSection(null); setMemberSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Members</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-send-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search members..."
          className="party-send-search-input"
          value={memberSearchQuery}
          onChange={(e) => setMemberSearchQuery(e.target.value)}
        />
      </div>

      <div className="party-members-list">
        {filteredMembers.map(member => {
          const isSilenced = silencedMembers.includes(member.id)
          const memberRole = getMemberRole(member)
          const isCurrentUser = member.id === currentUser?.id

          // Find current user's role in the party
          const currentUserMember = members.find(m => m.id === currentUser?.id)
          const myRole = currentUserMember?.role || 'member'
          const amLeader = myRole === 'founder'
          const amAdmin = myRole === 'admin' || myRole === 'moderator'

          // Determine what actions to show based on roles
          const memberIsLeader = memberRole === 'founder'
          const memberIsAdmin = memberRole === 'admin' || memberRole === 'moderator'
          const memberIsMember = !memberIsLeader && !memberIsAdmin

          // Leader sees: promote/silence/block on members, demote/silence/block on admins
          // Admin sees: silence/block on members only
          // Member sees: nothing on anyone
          const showPromote = amLeader && memberIsMember
          const showDemote = amLeader && memberIsAdmin
          const showSilence = (amLeader && !isCurrentUser) || (amAdmin && memberIsMember)
          const showBlock = (amLeader && !isCurrentUser) || (amAdmin && memberIsMember)

          return (
            <div key={member.id} className="party-member-item">
              <img
                src={member.avatar}
                alt={member.username}
                className="party-member-avatar"
                onClick={() => onOpenProfile?.({ id: member.id, username: member.username, avatar: member.avatar })}
                style={{ cursor: 'pointer' }}
              />
              <div className="party-member-info">
                <span
                  className="party-member-username"
                  onClick={() => onOpenProfile?.({ id: member.id, username: member.username, avatar: member.avatar })}
                  style={{ cursor: 'pointer' }}
                >
                  {member.username}
                </span>
                <span className="party-member-role">{memberRole}</span>
              </div>
              <div className="party-member-actions">
                {isCurrentUser ? (
                  <button
                    className="party-member-action-btn leave"
                    title="Leave Party"
                    onClick={handleLeaveParty}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                ) : (
                  <>
                    {showSilence && (
                      <button
                        className="party-member-action-btn"
                        onClick={() => toggleSilenceMember(member.id)}
                        title={isSilenced ? 'Unsilence' : 'Silence'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {isSilenced ? (
                            <>
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                          ) : (
                            <>
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                          )}
                        </svg>
                      </button>
                    )}
                    {showPromote && (
                      <button
                        className="party-member-action-btn"
                        onClick={() => promoteMember(member.id, memberRole)}
                        title="Promote"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </button>
                    )}
                    {showDemote && (
                      <button
                        className="party-member-action-btn"
                        onClick={() => demoteMember(member.id, memberRole)}
                        title="Demote"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </button>
                    )}
                    {showBlock && (
                      <button
                        className="party-member-action-btn ban"
                        title="Block"
                        onClick={() => blockMember(member.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
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

  // Render Admin Settings Section
  const renderAdministrativeSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Admin Settings</h1>
        <div style={{ width: 36 }} />
      </div>

      <p className="party-settings-section-label">Member Management</p>
      <div className="party-settings-card">
        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Accept Join Requests</span>
              <span className="party-settings-row-sublabel">Admins can approve new members</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.acceptRequests ? 'active' : ''}`}
            onClick={() => togglePermission('acceptRequests')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Block Members</span>
              <span className="party-settings-row-sublabel">Admins can block members from party</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.blockMembers ? 'active' : ''}`}
            onClick={() => togglePermission('blockMembers')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Silence Members</span>
              <span className="party-settings-row-sublabel">Admins can mute users temporarily</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.silenceMembers ? 'active' : ''}`}
            onClick={() => togglePermission('silenceMembers')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>
      </div>

      <p className="party-settings-section-label">Content</p>
      <div className="party-settings-card">
        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Delete Messages</span>
              <span className="party-settings-row-sublabel">Admins can remove any message</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.deleteMessages ? 'active' : ''}`}
            onClick={() => togglePermission('deleteMessages')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Pin Messages</span>
              <span className="party-settings-row-sublabel">Admins can pin announcements</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.pinMessages ? 'active' : ''}`}
            onClick={() => togglePermission('pinMessages')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Edit Party Info</span>
              <span className="party-settings-row-sublabel">Admins can change name, photo, bio</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.editPartyInfo ? 'active' : ''}`}
            onClick={() => togglePermission('editPartyInfo')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>
      </div>

      <p className="party-settings-section-label">Moderation</p>
      <div className="party-settings-card">
        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Promote Admins</span>
              <span className="party-settings-row-sublabel">Admins can promote or demote to or below their level</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.promoteAdmins ? 'active' : ''}`}
            onClick={() => togglePermission('promoteAdmins')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Change Theme</span>
              <span className="party-settings-row-sublabel">Admins can change party color</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.changeTheme ? 'active' : ''}`}
            onClick={() => togglePermission('changeTheme')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>
      </div>

      <p className="party-settings-section-label">Race Participation</p>
      <div className="party-settings-card">
        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Enter Races</span>
              <span className="party-settings-row-sublabel">Admins can enter party into races</span>
            </div>
          </div>
          <button
            className={`party-toggle ${adminPermissions.enterRaces ? 'active' : ''}`}
            onClick={() => togglePermission('enterRaces')}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>
      </div>
    </div>
  )

  // Render Chat Settings Section
  const renderChatSettingsSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Chat Settings</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-settings-card" style={{ marginTop: 20 }}>
        <div className="party-settings-row no-hover">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Admins Only</span>
              <span className="party-settings-row-sublabel">Only admins can send messages</span>
            </div>
          </div>
          <button
            className={`party-toggle ${chatSettings.adminsOnly ? 'active' : ''}`}
            onClick={() => setChatSettings(prev => ({ ...prev, adminsOnly: !prev.adminsOnly, cycleEnabled: prev.adminsOnly ? prev.cycleEnabled : false }))}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>

        <div className="party-settings-row no-hover extended">
          <div className="party-settings-row-left">
            <div className="party-settings-row-text">
              <span className="party-settings-row-label">Cycle Mode</span>
              <span className="party-settings-row-sublabel">As parties grow larger, group chats become difficult to manage. Cycle mode automates daily cohorts—admins always have chat access, while community members rotate in and out based on engagement and interactions. This becomes most important for chats of 500+ size.</span>
            </div>
          </div>
          <button
            className={`party-toggle ${chatSettings.cycleEnabled ? 'active' : ''}`}
            onClick={() => setChatSettings(prev => ({ ...prev, cycleEnabled: !prev.cycleEnabled, adminsOnly: prev.cycleEnabled ? prev.adminsOnly : false }))}
          >
            <span className="party-toggle-knob" />
          </button>
        </div>
      </div>

          </div>
  )

  // Render Send to Users Section
  const toggleSentToUser = (userId) => {
    const isSent = sentToUsers.includes(userId)
    const isUnsent = unsentUsers.includes(userId)

    if (isSent) {
      // Currently sent -> make unsent
      setSentToUsers(prev => prev.filter(id => id !== userId))
      setUnsentUsers(prev => [...prev, userId])
    } else {
      // Not sent or unsent -> make sent
      setSentToUsers(prev => [...prev, userId])
      setUnsentUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const filteredUsers = connectedUsers.filter(user =>
    user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const renderSendToUsersSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Send To</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-send-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          className="party-send-search-input"
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
        />
      </div>

      <div className="party-send-list">
        {filteredUsers.map(user => {
          const isSent = sentToUsers.includes(user.id)
          const isUnsent = unsentUsers.includes(user.id)
          let buttonText = 'Send'
          if (isSent) buttonText = 'Sent'
          else if (isUnsent) buttonText = 'Unsent'

          return (
            <div key={user.id} className="party-send-item">
              <img src={user.avatar} alt={user.username} className="party-send-avatar" />
              <span className="party-send-username">{user.username}</span>
              <button
                className={`party-send-status-btn ${isSent ? 'sent' : ''}`}
                onClick={() => toggleSentToUser(user.id)}
              >
                {buttonText}
              </button>
            </div>
          )
        })}
      </div>

      <button
        className={`party-done-btn ${sentToUsers.length > 0 ? 'active' : ''}`}
        onClick={() => { setActiveSection(null); setUserSearchQuery(''); }}
      >
        Done
      </button>
    </div>
  )

  // Render Banned Members Section
  const unbanUser = async (userId) => {
    if (!partyId) return

    try {
      await partiesApi.unbanMember(partyId, userId)
      // Remove from banned list
      setBannedUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Failed to unban member:', error)
    }
  }

  const filteredBannedUsers = bannedUsers.filter(user =>
    user.username.toLowerCase().includes(bannedSearchQuery.toLowerCase())
  )

  const renderBannedSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => { setActiveSection(null); setBannedSearchQuery(''); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">Banned Members</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-banned-search-row">
        <div className="party-send-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search banned users..."
            className="party-send-search-input"
            value={bannedSearchQuery}
            onChange={(e) => setBannedSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoadingBanned ? (
        <div className="party-banned-empty">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="party-banned-list">
          {filteredBannedUsers.map(user => (
            <div key={user.id} className="party-banned-item">
              <img src={user.avatar} alt={user.username} className="party-banned-avatar" />
              <div className="party-banned-info">
                <span className="party-banned-username">{user.username}</span>
                <span className="party-banned-date">Banned {user.bannedDate}</span>
              </div>
              <button
                className="party-ban-toggle-btn"
                onClick={() => unbanUser(user.id)}
              >
                Unban
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoadingBanned && filteredBannedUsers.length === 0 && (
        <div className="party-banned-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <p>No banned members</p>
        </div>
      )}
    </div>
  )

  // Render New Groupchat Section
  const toggleGroupChatMember = (memberId) => {
    if (selectedGroupChatMembers.includes(memberId)) {
      setSelectedGroupChatMembers(prev => prev.filter(id => id !== memberId))
    } else {
      setSelectedGroupChatMembers(prev => [...prev, memberId])
    }
  }

  const filteredGroupChatMembers = members.filter(member =>
    member.id !== currentUser?.id && // Exclude current user - they'll be added automatically
    member.username.toLowerCase().includes(groupChatSearchQuery.toLowerCase())
  )

  const handleCreateGroupChat = () => {
    // Get full member data for selected members
    const selectedMembersData = members.filter(m => selectedGroupChatMembers.includes(m.id))
    console.log('Creating groupchat with members:', selectedMembersData)

    // Call the callback with selected members
    if (onCreateGroupChat && selectedMembersData.length > 0) {
      onCreateGroupChat(selectedMembersData)
    }

    // Close settings
    setActiveSection(null)
    setGroupChatSearchQuery('')
    setSelectedGroupChatMembers([])
    onClose()
  }

  const renderNewGroupChatSection = () => (
    <div className="party-settings-page">
      <div className="party-settings-header">
        <button className="party-settings-back" onClick={() => { setActiveSection(null); setGroupChatSearchQuery(''); setSelectedGroupChatMembers([]); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="party-settings-title">New Groupchat</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="party-send-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search members..."
          className="party-send-search-input"
          value={groupChatSearchQuery}
          onChange={(e) => setGroupChatSearchQuery(e.target.value)}
        />
      </div>

      {isLoadingMembers ? (
        <div className="party-banned-empty">
          <p>Loading members...</p>
        </div>
      ) : (
        <div className="party-send-list">
          {filteredGroupChatMembers.map(member => {
            const isSelected = selectedGroupChatMembers.includes(member.id)

            return (
              <div key={member.id} className="party-send-item">
                <img src={member.avatar} alt={member.username} className="party-send-avatar" />
                <div className="party-member-info" style={{ flex: 1 }}>
                  <span className="party-send-username">{member.username}</span>
                  <span className="party-member-role" style={{ fontSize: 11, opacity: 0.6 }}>{member.role}</span>
                </div>
                <button
                  className={`party-send-status-btn ${isSelected ? 'sent' : ''}`}
                  onClick={() => toggleGroupChatMember(member.id)}
                >
                  {isSelected ? 'Added' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {filteredGroupChatMembers.length === 0 && !isLoadingMembers && (
        <div className="party-banned-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <p>No members found</p>
        </div>
      )}

      <button
        className={`party-done-btn ${selectedGroupChatMembers.length > 0 ? 'active' : ''}`}
        onClick={handleCreateGroupChat}
        disabled={selectedGroupChatMembers.length === 0}
      >
        Create Groupchat {selectedGroupChatMembers.length > 0 && `(${selectedGroupChatMembers.length})`}
      </button>
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
      {activeSection === 'new-groupchat' && renderNewGroupChatSection()}
      {activeSection === 'administrative' && renderAdministrativeSection()}
      {activeSection === 'chat-settings' && renderChatSettingsSection()}
      {activeSection === 'banned' && renderBannedSection()}
      {activeSection === 'send-to-users' && renderSendToUsersSection()}
    </div>
  )
}

export default PartySettings
