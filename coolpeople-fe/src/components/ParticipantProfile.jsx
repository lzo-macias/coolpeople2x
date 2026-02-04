import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ParticipantProfile.css'
import '../styling/CandidateProfile.css' // For stat modal styles
import { getPartyColor } from '../data/mockData'
import { usersApi, reelsApi } from '../services/api'
import EditProfile from './EditProfile'

function ParticipantProfile({
  participant: passedParticipant,
  isOwnProfile = false,
  onPartyClick,
  onOptIn,
  cachedProfile,
  onProfileLoaded,
  onFollowChange,
  onMessageUser,
  onAvatarChange,
  onBioChange,
  onUserTypeChange,
}) {
  // State for fetched profile data
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetchedPosts, setFetchedPosts] = useState([])
  const [fetchedReposts, setFetchedReposts] = useState([])

  // Fetch profile data, posts, and reposts from API
  useEffect(() => {
    const fetchProfileData = async () => {
      const userId = passedParticipant?.userId || passedParticipant?.id
      console.log('[ParticipantProfile] Fetching data for userId:', userId, 'passedParticipant:', passedParticipant)
      if (!userId) {
        console.log('[ParticipantProfile] No userId, skipping fetch')
        return
      }

      try {
        const profileRes = await usersApi.getUser(userId)
        console.log('[ParticipantProfile] Profile response:', profileRes)
        const profileData = profileRes.data?.user || profileRes.user || profileRes.data || profileRes

        // If user is now a CANDIDATE (opted in), switch to CandidateProfile
        if (profileData.userType === 'CANDIDATE' && onUserTypeChange) {
          onUserTypeChange('CANDIDATE', {
            ...profileData,
            id: profileData.id || userId,
            userId: profileData.userId || userId,
          })
          return // Exit early - parent will switch to CandidateProfile
        }

        setFetchedProfile(profileData)

        // Update the centralized cache with fresh data
        if (onProfileLoaded && profileData) {
          onProfileLoaded({
            ...profileData,
            id: profileData.id || userId,
            userId: profileData.userId || userId,
          })
        }

        // Fetch user's posts
        try {
          const postsRes = await reelsApi.getUserReels(userId)
          console.log('[ParticipantProfile] Posts response:', postsRes)
          const postsData = postsRes.data || postsRes.reels || postsRes || []
          console.log('[ParticipantProfile] Setting posts:', postsData)
          setFetchedPosts(Array.isArray(postsData) ? postsData : [])
        } catch (e) {
          console.log('[ParticipantProfile] Failed to fetch posts:', e.message)
          setFetchedPosts([])
        }

        // Fetch user's reposts
        try {
          const repostsRes = await reelsApi.getUserReposts(userId)
          console.log('[ParticipantProfile] Reposts response:', repostsRes)
          const repostsData = repostsRes.data || repostsRes.reels || repostsRes || []
          console.log('[ParticipantProfile] Setting reposts:', repostsData)
          setFetchedReposts(Array.isArray(repostsData) ? repostsData : [])
        } catch (e) {
          console.log('[ParticipantProfile] Failed to fetch reposts:', e.message)
          setFetchedReposts([])
        }
      } catch (error) {
        console.log('Failed to fetch profile:', error.message)
      }
    }

    fetchProfileData()
  }, [passedParticipant?.userId, passedParticipant?.id])

  // Merge passed participant with defaults, preferring fetched data, then cached data
  // Normalize party to string (API returns object {id, name})
  const normalizeParty = (p) => {
    if (!p) return null
    if (typeof p === 'string') return p
    return p.name || null
  }

  // Use sensible defaults (no mock data) - real data will override these
  const defaultParticipant = {
    id: null,
    username: 'User',
    avatar: null,
    party: null,
    nominations: '0',
    followers: '0',
    following: '0',
    cpPoints: 0,
    ranking: '0%',
    isFollowing: false,
    isFavorited: false,
    hasOptedIn: false,
    bio: '',
    races: [],
  }

  const participant = {
    ...defaultParticipant,
    ...passedParticipant,
    ...cachedProfile,
    ...fetchedProfile,
    // Normalize avatar (backend uses avatarUrl)
    avatar: fetchedProfile?.avatarUrl || fetchedProfile?.avatar ||
            cachedProfile?.avatarUrl || cachedProfile?.avatar ||
            passedParticipant?.avatarUrl || passedParticipant?.avatar ||
            defaultParticipant.avatar,
    // Normalize followers/following to strings
    followers: fetchedProfile?.followersCount?.toString() || fetchedProfile?.followers?.toString() ||
               cachedProfile?.followersCount?.toString() || cachedProfile?.followers?.toString() ||
               passedParticipant?.followers?.toString() || defaultParticipant.followers,
    following: fetchedProfile?.followingCount?.toString() || fetchedProfile?.following?.toString() ||
               cachedProfile?.followingCount?.toString() || cachedProfile?.following?.toString() ||
               passedParticipant?.following?.toString() || defaultParticipant.following,
    party: normalizeParty(fetchedProfile?.party) || normalizeParty(cachedProfile?.party) || normalizeParty(passedParticipant?.party) || defaultParticipant.party,
    // Normalize nominations
    nominations: fetchedProfile?.nominationsCount?.toString() || fetchedProfile?.nominations?.toString() ||
                 cachedProfile?.nominationsCount?.toString() || cachedProfile?.nominations?.toString() ||
                 passedParticipant?.nominations?.toString() || defaultParticipant.nominations,
  }

  console.log('[ParticipantProfile] Merged participant:', {
    id: participant.id,
    userId: participant.userId,
    username: participant.username,
    avatar: participant.avatar,
    bio: participant.bio,
    followers: participant.followers,
    following: participant.following,
    party: participant.party,
    nominations: participant.nominations,
  })

  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [showEditBio, setShowEditBio] = useState(false)
  const [localFollowerCount, setLocalFollowerCount] = useState('0')

  // Sync state when fetched profile data arrives
  useEffect(() => {
    const followingStatus = fetchedProfile?.isFollowing ?? cachedProfile?.isFollowing ?? passedParticipant?.isFollowing ?? false
    const followerCount = fetchedProfile?.followersCount?.toString() || fetchedProfile?.followers?.toString() ||
                          cachedProfile?.followersCount?.toString() || cachedProfile?.followers?.toString() ||
                          passedParticipant?.followers?.toString() || '0'
    console.log('[ParticipantProfile] Syncing state - isFollowing:', followingStatus, 'followerCount:', followerCount)
    setIsFollowing(followingStatus)
    setLocalFollowerCount(followerCount)
    setIsFavorited(fetchedProfile?.isFavorited ?? cachedProfile?.isFavorited ?? passedParticipant?.isFavorited ?? false)
  }, [fetchedProfile, cachedProfile, passedParticipant])

  // Stat modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showRacesModal, setShowRacesModal] = useState(false)
  const [showNominationsModal, setShowNominationsModal] = useState(false)
  const [followersState, setFollowersState] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)

  const mockNominators = [
    { id: 'nom-1', username: 'community.hero', avatar: 'https://i.pravatar.cc/40?img=22', party: 'Democrat', count: 5 },
    { id: 'nom-2', username: 'local.activist', avatar: 'https://i.pravatar.cc/40?img=28', party: null, count: 3 },
    { id: 'nom-3', username: 'voter.2024', avatar: 'https://i.pravatar.cc/40?img=31', party: 'Republican', count: 2 },
    { id: 'nom-4', username: 'pink.supporter', avatar: 'https://i.pravatar.cc/40?img=45', party: 'The Pink Lady', count: 1 },
  ]

  // Fetch followers from API
  const fetchFollowers = async () => {
    const userId = participant.id || participant.userId
    if (!userId || isLoadingFollowers) return

    setIsLoadingFollowers(true)
    try {
      const response = await usersApi.getFollowers(userId)
      const data = response.data || response
      const followers = data.followers || []
      setFollowersState(followers.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar || f.profilePicture || 'https://i.pravatar.cc/40',
        party: f.party?.name || f.partyName || null,
        isFollowing: f.isFollowing || false,
      })))
    } catch (error) {
      console.error('Failed to fetch followers:', error)
      setFollowersState([])
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  const hasParty = participant.party && participant.party !== 'Independent'
  const partyColor = hasParty ? getPartyColor(participant.party) : '#808080'
  const partyDisplay = hasParty ? participant.party : 'Independent'

  // Handle follow/unfollow with cache update
  const handleFollowToggle = async () => {
    const userId = participant.id || participant.userId
    if (!userId) {
      console.error('[ParticipantProfile] Cannot follow: no user ID')
      return
    }

    const wasFollowing = isFollowing
    const currentFollowers = parseInt(localFollowerCount) || 0
    const newFollowerCount = wasFollowing ? currentFollowers - 1 : currentFollowers + 1

    // Optimistic update
    setIsFollowing(!wasFollowing)
    setLocalFollowerCount(newFollowerCount)

    // Notify parent for global cache update
    onFollowChange?.(!wasFollowing, newFollowerCount)

    try {
      if (wasFollowing) {
        await usersApi.unfollowUser(userId)
      } else {
        await usersApi.followUser(userId)
      }
    } catch (error) {
      console.error('[ParticipantProfile] Follow/unfollow failed:', error)
      // Revert on error
      setIsFollowing(wasFollowing)
      setLocalFollowerCount(currentFollowers)
    }
  }

  const tabs = [
    { name: 'Posts', id: 'posts', icon: '/icons/profile/userprofile/posts-icon.svg' },
    { name: 'Tags', id: 'tags', icon: '/icons/profile/userprofile/tags-icons.svg' },
    { name: 'Details', id: 'details', icon: '/icons/profile/userprofile/details-icon.svg' },
  ]

  return (
    <div className="participant-profile">
      {/* DEBUG BANNER - Remove after debugging */}
      <div style={{
        background: 'cyan',
        color: 'black',
        padding: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'relative',
        zIndex: 99999
      }}>
        PARTICIPANT PROFILE | ID: {participant.id || participant.userId || 'NO ID'} | User: {participant.username} | Posts: {fetchedPosts.length} | Reposts: {fetchedReposts.length}
      </div>

      {/* Header */}
      <div className="participant-header">
        {/* Favorite star */}
        <button
          className={`favorite-star ${isFavorited ? 'active' : ''}`}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#777777' : 'none'} stroke="#777777" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Top row: Avatar + Stats */}
        <div className="participant-top">
          <div className="participant-left">
            <div
              className="participant-avatar-ring"
              style={{ borderColor: hasParty ? partyColor : '#FF2A55' }}
            >
              {participant.avatar ? (
                <img src={participant.avatar} alt={participant.username} className="participant-avatar" />
              ) : (
                <div className="participant-avatar-placeholder">
                  {participant.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="participant-info">
              <h2 className="participant-username">{participant.username}</h2>
              <div className="participant-party-row">
                {hasParty ? (
                  <button
                    className="participant-party-btn"
                    onClick={() => onPartyClick?.(participant.party)}
                  >
                    {partyDisplay}
                  </button>
                ) : (
                  <span className="participant-party-text">{partyDisplay}</span>
                )}
                {isOwnProfile && !participant.hasOptedIn && (
                  <button className="opt-in-btn" onClick={onOptIn}>
                    opt in
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="participant-right">
            <div className="participant-stats-grid">
              <div className="stat-item clickable" onClick={() => setShowNominationsModal(true)}>
                <span className="stat-number">{participant.nominations}</span>
                <span className="stat-label">Nominations</span>
              </div>
              <div className="stat-item clickable" onClick={() => { setShowFollowersModal(true); fetchFollowers(); }}>
                <span className="stat-number">{localFollowerCount ?? participant.followers ?? '0'}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-item clickable" onClick={() => setShowRacesModal(true)}>
                <span className="stat-number">
                  {((participant.racesFollowing?.length || 0) +
                    (participant.racesWon?.length || 0)) ||
                    participant.races?.length || '0'}
                </span>
                <span className="stat-label">Races</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {participant.ranking || '.3%'}
                  <svg className="ranking-crown" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  </svg>
                </span>
                <span className="stat-label">ranking</span>
              </div>
            </div>
            <p className="participant-bio">{participant.bio || 'Building connections. Making a difference in our community.'}</p>
          </div>
        </div>

        {/* Action Buttons - Own Profile */}
        {isOwnProfile && (
          <div className="participant-actions">
            <button className="participant-action-btn share">share</button>
            <button className="participant-action-btn edit" onClick={() => setShowEditBio(true)}>edit</button>
            <button className="participant-action-btn invite">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="7" r="4" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            </button>
          </div>
        )}

        {/* Action Buttons - Other Profile */}
        {!isOwnProfile && (
          <div className="participant-actions">
            <button
              className="participant-action-btn messages"
              onClick={() => {
                console.log('=== MESSAGE BUTTON CLICKED IN ParticipantProfile ===')
                console.log('passedParticipant:', passedParticipant)
                console.log('cachedProfile:', cachedProfile)
                console.log('participant (merged):', participant)

                // Get the actual user ID from passed data, NOT from mock
                const userId = passedParticipant?.id || passedParticipant?.userId || cachedProfile?.id || cachedProfile?.userId
                console.log('Extracted userId:', userId)

                if (!userId) {
                  console.error('Cannot message user: no valid user ID found')
                  return
                }

                const messageData = {
                  id: userId,
                  username: participant.username,
                  avatar: participant.avatar || participant.avatarUrl,
                  displayName: participant.displayName || participant.username,
                }
                console.log('Calling onMessageUser with:', messageData)
                onMessageUser?.(messageData)
              }}
            >
              Message
            </button>
            <button className="participant-action-btn nominate">nominate</button>
            <button
              className={`participant-action-btn follow ${isFollowing ? 'following' : ''}`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? 'following' : 'follow'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="participant-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`participant-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.name}
            >
              <img src={tab.icon} alt={tab.name} className="tab-icon" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="participant-content">
        {activeTab === 'posts' && (
          <div className="posts-grid">
            {fetchedPosts.length === 0 ? (
              <div className="posts-empty">
                <p>No posts yet</p>
              </div>
            ) : (
              fetchedPosts.map((post, index) => (
                <div key={post.id || index} className="post-item">
                  {post.videoUrl ? (
                    <video
                      src={post.videoUrl}
                      className={post.isMirrored ? 'mirrored' : ''}
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => e.target.play()}
                      onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                  ) : (
                    <img src={post.thumbnailUrl || post.thumbnail || post} alt={`Post ${index + 1}`} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="posts-grid">
            {fetchedReposts.length === 0 ? (
              <div className="posts-empty">
                <p>No reposts yet</p>
              </div>
            ) : (
              fetchedReposts.map((repost, index) => (
                <div key={repost.id || index} className="post-item repost-item">
                  <div className="repost-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 1l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <path d="M7 23l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </div>
                  {repost.videoUrl ? (
                    <video
                      src={repost.videoUrl}
                      muted
                      playsInline
                      className={repost.isMirrored ? 'mirrored' : ''}
                    />
                  ) : (
                    <img src={repost.thumbnailUrl || repost.thumbnail || repost} alt={`Repost ${index + 1}`} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="activity-feed">
            <div className="activity-empty">
              <p>No activity yet</p>
              <span>Likes, comments, and nominations will appear here</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Overlay - rendered via portal */}
      {showEditBio && createPortal(
        <div className="edit-bio-overlay-portal">
          <EditProfile
            candidate={{
              id: participant.id || participant.userId,
              username: participant.username,
              bio: participant.bio,
              avatar: participant.avatar,
              party: participant.party || 'Independent',
              status: 'Participant',
            }}
            profileSections={{}}
            onSave={(updatedData) => {
              if (updatedData.bio !== undefined) {
                onBioChange?.(updatedData.bio)
              }
              if (updatedData.avatar) {
                onAvatarChange?.(updatedData.avatar)
              }
            }}
            onClose={() => setShowEditBio(false)}
            onOptOut={null}
          />
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Nominations Modal */}
      {showNominationsModal && createPortal(
        <div className="stat-modal-overlay" onClick={() => setShowNominationsModal(false)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Nominations</h3>
              <button className="stat-modal-close" onClick={() => setShowNominationsModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {mockNominators.map((nominator) => (
                <div
                  key={nominator.id}
                  className="stat-modal-row clickable"
                  onClick={() => { setShowNominationsModal(false); }}
                >
                  <div className="stat-row-user">
                    <div className="stat-row-avatar-ring" style={{ borderColor: getPartyColor(nominator.party) }}>
                      <img src={nominator.avatar} alt={nominator.username} className="stat-row-avatar" />
                    </div>
                    <div className="stat-row-info">
                      <span className="stat-row-username">{nominator.username}</span>
                      <span className="stat-row-meta">{nominator.count} nomination{nominator.count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Followers Modal */}
      {showFollowersModal && createPortal(
        <div className="stat-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Followers</h3>
              <button className="stat-modal-close" onClick={() => setShowFollowersModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {isLoadingFollowers ? (
                <div className="stat-modal-loading">Loading...</div>
              ) : followersState.length === 0 ? (
                <div className="stat-modal-empty">No followers yet</div>
              ) : (
                followersState.map((follower) => (
                  <div key={follower.id} className="stat-modal-row">
                    <div
                      className="stat-row-user clickable"
                      onClick={() => { setShowFollowersModal(false); }}
                    >
                      <div className="stat-row-avatar-ring" style={{ borderColor: getPartyColor(follower.party) }}>
                        <img src={follower.avatar} alt={follower.username} className="stat-row-avatar" />
                      </div>
                      <span className="stat-row-username">{follower.username}</span>
                    </div>
                    <button
                      className={`stat-row-follow-btn ${follower.isFollowing ? 'following' : ''}`}
                      onClick={async () => {
                        const wasFollowing = follower.isFollowing
                        setFollowersState(prev => prev.map(f =>
                          f.id === follower.id ? { ...f, isFollowing: !f.isFollowing } : f
                        ))
                        try {
                          if (wasFollowing) {
                            await usersApi.unfollowUser(follower.id)
                          } else {
                            await usersApi.followUser(follower.id)
                          }
                        } catch (error) {
                          setFollowersState(prev => prev.map(f =>
                            f.id === follower.id ? { ...f, isFollowing: wasFollowing } : f
                          ))
                        }
                      }}
                    >
                      {follower.isFollowing ? 'following' : 'follow'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Races Modal */}
      {showRacesModal && createPortal(
        <div className="stat-modal-overlay" onClick={() => setShowRacesModal(false)}>
          <div className="stat-modal races" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>Races</h3>
              <button className="stat-modal-close" onClick={() => setShowRacesModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="stat-modal-content">
              {/* Won Races */}
              {(participant.racesWon || []).map((race) => (
                <div key={race.id} className="stat-modal-row race-row won">
                  <div className="race-row-info">
                    <div className="race-row-indicator won"></div>
                    <span className="race-row-name">{race.title || race.name}</span>
                  </div>
                  <span className="race-row-position won">Winner</span>
                </div>
              ))}

              {/* Following Races */}
              {(participant.racesFollowing || []).map((race) => (
                <div
                  key={race.id}
                  className="stat-modal-row race-row clickable"
                  onClick={() => { setShowRacesModal(false); }}
                >
                  <div className="race-row-info">
                    <div className="race-row-indicator following"></div>
                    <span className="race-row-name">{race.title || race.name}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              ))}

              {/* Empty state */}
              {(participant.racesWon || []).length === 0 &&
               (participant.racesFollowing || []).length === 0 && (
                <div className="stat-modal-empty">No races yet</div>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </div>
  )
}

export default ParticipantProfile
