import { useState } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ReelActions.css'
import { getPartyColor } from '../data/mockData'
import { reelsApi, usersApi } from '../services/api'

// Mock recent contacts for share sheet (users, parties, group chats)
const recentContacts = [
  { id: 1, name: 'jordy.t', avatar: 'https://i.pravatar.cc/80?img=1', active: '12m', type: 'user' },
  { id: 2, name: 'Pink Lady Party', avatar: 'https://i.pravatar.cc/80?img=20', active: null, type: 'party' },
  { id: 3, name: 'NYC Progressives', avatar: 'https://i.pravatar.cc/80?img=21', active: null, type: 'group', memberCount: 24 },
  { id: 4, name: 'Elias', avatar: 'https://i.pravatar.cc/80?img=2', active: null, type: 'user' },
  { id: 5, name: 'Green Coalition', avatar: 'https://i.pravatar.cc/80?img=22', active: null, type: 'party' },
  { id: 6, name: 'thatgirl.s...', avatar: 'https://i.pravatar.cc/80?img=3', active: null, type: 'user' },
  { id: 7, name: 'Policy Nerds', avatar: 'https://i.pravatar.cc/80?img=23', active: '5m', type: 'group', memberCount: 8 },
  { id: 8, name: 'sethclash', avatar: 'https://i.pravatar.cc/80?img=4', active: null, type: 'user' },
  { id: 9, name: 'willow.s', avatar: 'https://i.pravatar.cc/80?img=5', active: null, type: 'user' },
  { id: 10, name: 'Liberty Party', avatar: 'https://i.pravatar.cc/80?img=24', active: null, type: 'party' },
  { id: 11, name: 'maya.2024', avatar: 'https://i.pravatar.cc/80?img=7', active: '3m', type: 'user' },
  { id: 12, name: 'Local Activists', avatar: 'https://i.pravatar.cc/80?img=25', active: null, type: 'group', memberCount: 156 },
]

function ReelActions({ user, stats, onOpenComments, onTrackActivity, reel }) {
  const partyColor = getPartyColor(user?.party)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(stats?.likes || '9,999')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState([])
  const [createGroupExpanded, setCreateGroupExpanded] = useState(false)
  const [showRepostMenu, setShowRepostMenu] = useState(false)

  const handleLike = async () => {
    // Optimistic update
    const wasLiked = isLiked
    if (wasLiked) {
      const num = parseInt(likeCount.replace(/,/g, '')) - 1
      setLikeCount(num.toLocaleString())
    } else {
      const num = parseInt(likeCount.replace(/,/g, '')) + 1
      setLikeCount(num.toLocaleString())
      if (onTrackActivity && reel) {
        onTrackActivity('like', reel)
      }
    }
    setIsLiked(!wasLiked)

    // Sync with API
    try {
      if (reel?.id) {
        if (wasLiked) {
          await reelsApi.unlikeReel(reel.id)
        } else {
          await reelsApi.likeReel(reel.id)
        }
      }
    } catch (error) {
      // Revert on error
      console.log('Like error:', error.message)
      setIsLiked(wasLiked)
      const num = parseInt(likeCount.replace(/,/g, '')) + (wasLiked ? 1 : -1)
      setLikeCount(num.toLocaleString())
    }
  }

  const handleRepost = async () => {
    try {
      if (reel?.id) {
        await reelsApi.repostReel(reel.id)
      }
    } catch (error) {
      console.log('Repost error:', error.message)
    }
    setShowRepostMenu(false)
  }

  const handleShare = async () => {
    try {
      if (reel?.id) {
        await reelsApi.shareReel(reel.id)
      }
    } catch (error) {
      console.log('Share error:', error.message)
    }
  }

  const handleFollow = async () => {
    try {
      if (user?.id) {
        await usersApi.followUser(user.id)
      }
    } catch (error) {
      console.log('Follow error:', error.message)
    }
  }

  return (
    <div className="reel-actions">
      {/* Profile with follow badge */}
      <button className="action-btn profile-btn" onClick={handleFollow}>
        <img
          src={user?.avatar || 'https://i.pravatar.cc/40?img=1'}
          alt="profile"
          className="action-avatar"
          style={{ borderColor: partyColor }}
        />
        <span className="follow-badge">+</span>
      </button>

      {/* Repost */}
      <button className="action-btn repost-btn" onClick={() => setShowRepostMenu(true)}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="action-count">{stats?.reposts || '9,999'}</span>
      </button>

      {/* Heart/Like */}
      <button className={`action-btn like-action ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill={isLiked ? '#ff6b9d' : 'none'} stroke={isLiked ? '#ff6b9d' : 'currentColor'} strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="action-count">{likeCount}</span>
      </button>

      {/* Comment with face */}
      <button className="action-btn" onClick={onOpenComments}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path d="M9 13h6" />
          <path d="M12 17v4" />
          <path d="M8 21h8" />
        </svg>
        <span className="action-count">{stats?.comments || '9,999'}</span>
      </button>

      {/* Share */}
      <button className="action-btn" onClick={() => { handleShare(); setShowShareSheet(true); }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span className="action-count">{stats?.shares || '9,999'}</span>
      </button>

      {/* Three dots menu */}
      <button className="action-btn dots-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {/* Repost Menu */}
      {showRepostMenu && createPortal(
        <div className="repost-menu-overlay" onClick={() => setShowRepostMenu(false)}>
          <div className="repost-menu" onClick={(e) => e.stopPropagation()}>
            <div className="repost-menu-handle" />
            <div className="repost-options-row">
              <button className="repost-option repost" onClick={handleRepost}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span>Repost</span>
              </button>
              <button className="repost-option quote-active" onClick={() => {
                // Handle quote
                setShowRepostMenu(false)
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Quote</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Sheet */}
      {showShareSheet && createPortal(
        <div className="share-sheet-overlay" onClick={(e) => {
          e.stopPropagation()
          setShowShareSheet(false)
        }}>
          <div className={`share-sheet ${createGroupExpanded ? 'expanded' : ''}`} onClick={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="share-sheet-handle"></div>

            {/* Search bar */}
            <div className="share-search-row">
              <div className="share-search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <button
                className={`create-group-btn ${createGroupExpanded ? 'active' : ''}`}
                onClick={() => setCreateGroupExpanded(!createGroupExpanded)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
                  <path d="M19 8v6M16 11h6" />
                </svg>
              </button>
            </div>

            {/* Create Group Expanded View */}
            {createGroupExpanded ? (
              <div className="create-group-content">
                {/* Parties */}
                <div className="share-section">
                  <h4 className="share-section-title">Parties</h4>
                  <div className="share-section-row">
                    {recentContacts
                      .filter(c => c.type === 'party' && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((contact) => (
                        <button
                          key={contact.id}
                          className={`share-contact ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedContacts(prev =>
                              prev.includes(contact.id)
                                ? prev.filter(id => id !== contact.id)
                                : [...prev, contact.id]
                            )
                          }}
                        >
                          <div className={`share-contact-avatar-wrap ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}>
                            <img src={contact.avatar} alt={contact.name} className="share-contact-avatar" />
                            {contact.active && <span className="share-contact-active">{contact.active}</span>}
                          </div>
                          <span className="share-contact-name">{contact.name}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Users */}
                <div className="share-section">
                  <h4 className="share-section-title">Users</h4>
                  <div className="share-section-row">
                    {recentContacts
                      .filter(c => c.type === 'user' && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((contact) => (
                        <button
                          key={contact.id}
                          className={`share-contact ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedContacts(prev =>
                              prev.includes(contact.id)
                                ? prev.filter(id => id !== contact.id)
                                : [...prev, contact.id]
                            )
                          }}
                        >
                          <div className={`share-contact-avatar-wrap ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}>
                            <img src={contact.avatar} alt={contact.name} className="share-contact-avatar" />
                            {contact.active && <span className="share-contact-active">{contact.active}</span>}
                          </div>
                          <span className="share-contact-name">{contact.name}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Group Chats */}
                <div className="share-section">
                  <h4 className="share-section-title">Group Chats</h4>
                  <div className="share-section-row">
                    {recentContacts
                      .filter(c => c.type === 'group' && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((contact) => (
                        <button
                          key={contact.id}
                          className={`share-contact ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedContacts(prev =>
                              prev.includes(contact.id)
                                ? prev.filter(id => id !== contact.id)
                                : [...prev, contact.id]
                            )
                          }}
                        >
                          <div className={`share-contact-avatar-wrap ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}>
                            <img src={contact.avatar} alt={contact.name} className="share-contact-avatar" />
                            {contact.active && <span className="share-contact-active">{contact.active}</span>}
                          </div>
                          <span className="share-contact-name">{contact.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Recent contacts grid */
              <div className="share-contacts-grid">
              {recentContacts
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((contact) => (
                  <button
                    key={contact.id}
                    className={`share-contact ${selectedContacts.includes(contact.id) ? 'selected' : ''} ${contact.type}`}
                    onClick={() => {
                      setSelectedContacts(prev =>
                        prev.includes(contact.id)
                          ? prev.filter(id => id !== contact.id)
                          : [...prev, contact.id]
                      )
                    }}
                  >
                    <div className={`share-contact-avatar-wrap ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}>
                      <img src={contact.avatar} alt={contact.name} className="share-contact-avatar" />
                      {contact.active && <span className="share-contact-active">{contact.active}</span>}
                    </div>
                    <span className="share-contact-name">{contact.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom actions */}
            <div className="share-actions-row">
              <button className="share-action-item">
                <div className="share-action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span>Add to story</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon whatsapp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span>WhatsApp</span>
              </button>
              <button className="share-action-item" onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                setShowShareSheet(false)
              }}>
                <div className="share-action-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <span>Copy link</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon messages">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <span>Messages</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon x-twitter">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span>X</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon telegram">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <span>Telegram</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon instagram">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span>Instagram</span>
              </button>
              <button className="share-action-item">
                <div className="share-action-icon facebook">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span>Facebook</span>
              </button>
            </div>

            {/* Send button */}
            <button
              className={`share-send-btn ${selectedContacts.length > 0 ? 'active' : ''}`}
              onClick={() => selectedContacts.length > 0 && setShowShareSheet(false)}
            >
              {createGroupExpanded ? 'Send together' : 'Send'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ReelActions
