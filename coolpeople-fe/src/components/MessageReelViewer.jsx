import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ReelCard.css'
import '../styling/ReelActions.css'
import ReelActions from './ReelActions'
import CommentsSection from './CommentsSection'
import { getPartyColor } from '../data/mockData'
import { reelsApi, partiesApi } from '../services/api'

function MessageReelViewer({ messages, initialMessageId, onClose, onAcceptInvite, senderUser, currentUserAvatar, onTrackActivity, onLikeChange, onCommentAdded, onOpenProfile, onOpenPartyProfile }) {
  // Track video load errors to fallback to thumbnail
  const [videoError, setVideoError] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [localStats, setLocalStats] = useState({}) // Track local like/comment counts per message
  const [joinStatus, setJoinStatus] = useState({}) // Track join status per party { partyId: 'idle' | 'joining' | 'joined' | 'requested' }
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const segIdxRef = useRef(0)
  const rafRef = useRef(null)
  const editDataRef = useRef(null)
  const soundAudioRef = useRef(null)

  // Find the single target message directly
  const currentMessage = messages.find(msg => msg.id === initialMessageId)

  const isPartyInvite = currentMessage?.metadata?.type === 'party_invite'
  const isSharedReel = currentMessage?.metadata?.type === 'reel' || currentMessage?.reelId || currentMessage?.metadata?.reelId
  const isDirectVideo = !isPartyInvite && !isSharedReel
  // Get reel ID from message or metadata (party invites should include reelId)
  const metadataReelId = currentMessage?.reelId || currentMessage?.metadata?.reelId || null
  const [resolvedReelId, setResolvedReelId] = useState(null)
  const reelId = metadataReelId || resolvedReelId

  // Track if video is ready to play
  const [videoReady, setVideoReady] = useState(false)

  // Fallback: resolve reel ID by looking up user's reels when metadata doesn't have it
  useEffect(() => {
    const resolveReelId = async () => {
      if (metadataReelId) return // Already have it
      if (!currentMessage?.metadata) return

      const videoUrl = currentMessage.metadata.videoUrl || currentMessage.metadata.introVideoUrl || currentMessage.mediaUrl
      const userId = currentMessage.metadata.user?.id

      if (!userId || !videoUrl) return

      try {
        console.log('Resolving reel ID - fetching reels for user:', userId)
        const response = await reelsApi.getUserReels(userId)
        const userReels = response.data || []
        const matchingReel = userReels.find(r => r.videoUrl === videoUrl)
        if (matchingReel) {
          console.log('Resolved reel ID:', matchingReel.id)
          setResolvedReelId(matchingReel.id)
        } else {
          console.warn('Could not resolve reel ID - no matching reel found for video URL')
        }
      } catch (error) {
        console.log('Could not resolve reel ID:', error.message)
      }
    }

    resolveReelId()
  }, [metadataReelId, currentMessage])

  // Fetch reel stats from backend when reelId is available
  useEffect(() => {
    const fetchReelStats = async () => {
      if (!reelId) return

      try {
        console.log('Fetching reel stats for:', reelId)
        const response = await reelsApi.getReel(reelId)
        const reel = response.data?.reel || response.reel || response.data || response

        if (reel) {
          console.log('Reel stats fetched:', reel)
          setLocalStats(prev => ({
            ...prev,
            [reelId]: {
              likes: reel.likeCount || reel.stats?.likes || 0,
              comments: reel.commentCount || reel.stats?.comments || 0,
              isLiked: reel.isLiked || false,
              reposts: reel.repostCount || reel.stats?.reposts || 0,
              isReposted: reel.isReposted || false
            }
          }))
        }
      } catch (error) {
        console.log('Could not fetch reel stats:', error.message)
      }
    }

    fetchReelStats()
  }, [reelId])

  const getVideoUrl = () => {
    if (isPartyInvite) {
      // Prefer base64 (persistent) over blob URL (session-only)
      return currentMessage.metadata.introVideoBase64 || currentMessage.metadata.introVideoUrl
    }
    return currentMessage?.mediaUrl || currentMessage?.metadata?.videoUrl
  }

  const getThumbnail = () => {
    if (isPartyInvite) {
      return currentMessage.metadata.partyAvatar
    }
    return null
  }

  const getUser = () => {
    if (isPartyInvite) {
      return {
        username: currentMessage.metadata.partyHandle || currentMessage.metadata.partyName,
        avatar: currentMessage.metadata.partyAvatar,
        party: null
      }
    }
    // Shared reels carry the original poster's info in metadata.user
    if (isSharedReel && currentMessage.metadata?.user) {
      const reelUser = currentMessage.metadata.user
      return {
        username: reelUser.username || reelUser.displayName || 'Unknown',
        avatar: reelUser.avatar || reelUser.avatarUrl,
        party: reelUser.party || null
      }
    }
    return currentMessage?.isOwn ? {
      username: 'You',
      avatar: currentUserAvatar || 'https://i.pravatar.cc/40?img=12',
      party: null
    } : {
      username: senderUser?.username || 'Unknown',
      avatar: senderUser?.avatar,
      party: senderUser?.party
    }
  }

  if (!currentMessage) {
    return null
  }

  const videoUrl = getVideoUrl()
  const thumbnail = getThumbnail()
  const user = getUser()
  const isMirrored = isSharedReel ? false : (currentMessage.isMirrored || currentMessage.metadata?.isMirrored || currentMessage.metadata?.introVideoMirrored)

  // --- Edit-aware playback for message videos ---
  const msgEditMeta = currentMessage?.metadata || {}
  const msgPlaybackSegments = msgEditMeta.segments || (msgEditMeta.trimEnd != null ? [{ start: msgEditMeta.trimStart ?? 0, end: msgEditMeta.trimEnd }] : null)
  const msgHasEditPlayback = !!msgPlaybackSegments
  editDataRef.current = {
    segments: msgPlaybackSegments,
    videoVolume: msgEditMeta.videoVolume ?? 100,
    soundVolume: msgEditMeta.soundVolume ?? 100,
    soundOffset: msgEditMeta.soundOffset ?? 0,
    soundUrl: msgEditMeta.soundUrl || null,
    soundStartFrac: msgEditMeta.soundStartFrac ?? 0,
    soundEndFrac: msgEditMeta.soundEndFrac ?? 1,
  }

  // Seek to first segment on load
  useEffect(() => {
    if (!msgHasEditPlayback) return
    const vid = videoRef.current
    if (!vid) return
    const seekToStart = () => {
      const segs = editDataRef.current?.segments
      if (segs && segs[0]) {
        segIdxRef.current = 0
        vid.currentTime = segs[0].start
      }
    }
    vid.addEventListener('loadedmetadata', seekToStart)
    if (vid.readyState >= 1) seekToStart()
    return () => vid.removeEventListener('loadedmetadata', seekToStart)
  }, [msgHasEditPlayback, videoUrl])

  // Segment boundary enforcement + sound sync
  useEffect(() => {
    if (!msgHasEditPlayback) return
    const tick = () => {
      const vid = videoRef.current
      const ed = editDataRef.current
      const segs = ed?.segments
      if (!vid || vid.paused || !segs) { rafRef.current = requestAnimationFrame(tick); return }
      const idx = segIdxRef.current
      const seg = segs[idx]
      if (!seg) { rafRef.current = requestAnimationFrame(tick); return }
      if (vid.currentTime >= seg.end - 0.05) {
        if (idx < segs.length - 1) {
          segIdxRef.current = idx + 1
          vid.currentTime = segs[idx + 1].start
        } else {
          segIdxRef.current = 0
          vid.currentTime = segs[0].start
        }
      }
      // Sync sound audio
      const audio = soundAudioRef.current
      if (audio && audio.src) {
        let outputTime = 0
        for (let i = 0; i < segIdxRef.current; i++) outputTime += segs[i].end - segs[i].start
        const curSeg = segs[segIdxRef.current]
        if (curSeg) outputTime += Math.max(0, vid.currentTime - curSeg.start)
        const startFrac = ed.soundStartFrac ?? 0
        const sndStart = audio.duration ? startFrac * audio.duration : 0
        const targetAudioTime = sndStart + (ed.soundOffset ?? 0) + outputTime
        if (Math.abs(audio.currentTime - targetAudioTime) > 0.3) audio.currentTime = targetAudioTime
        if (audio.paused) audio.play().catch(() => {})
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [msgHasEditPlayback])

  // Handle video 'ended' for edit playback loop
  useEffect(() => {
    if (!msgHasEditPlayback) return
    const vid = videoRef.current
    if (!vid) return
    const handleEnded = () => {
      const segs = editDataRef.current?.segments
      if (segs && segs[0]) {
        segIdxRef.current = 0
        vid.currentTime = segs[0].start
        vid.play().catch(() => {})
      }
    }
    vid.addEventListener('ended', handleEnded)
    return () => vid.removeEventListener('ended', handleEnded)
  }, [msgHasEditPlayback])

  // Apply video volume from edit metadata (quote posts: mute main video)
  const isMsgQuotePost = !!msgEditMeta.quotedReelVideoUrl
  useEffect(() => {
    if (videoRef.current) {
      if (isMsgQuotePost) {
        videoRef.current.volume = 0
        videoRef.current.muted = true
      } else {
        videoRef.current.volume = (msgEditMeta.videoVolume ?? 100) / 100
      }
    }
  }, [msgEditMeta.videoVolume, isMsgQuotePost])

  // Setup sound audio element from edit metadata
  useEffect(() => {
    const soundUrl = editDataRef.current?.soundUrl
    if (!soundUrl) { soundAudioRef.current = null; return }
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = (editDataRef.current?.soundVolume ?? 100) / 100
    audio.src = soundUrl
    soundAudioRef.current = audio
    return () => { audio.pause(); audio.src = ''; soundAudioRef.current = null }
  }, [msgEditMeta.soundUrl])

  // Update sound volume
  useEffect(() => {
    if (soundAudioRef.current) soundAudioRef.current.volume = (msgEditMeta.soundVolume ?? 100) / 100
  }, [msgEditMeta.soundVolume])

  // Sound sync for non-segment videos (no RAF loop from segment enforcement)
  useEffect(() => {
    if (msgHasEditPlayback) return // Segment RAF already handles sound sync
    const soundUrl = editDataRef.current?.soundUrl
    if (!soundUrl) return
    const tick = () => {
      const vid = videoRef.current
      const audio = soundAudioRef.current
      if (!vid || vid.paused || !audio || !audio.src) { rafRef.current = requestAnimationFrame(tick); return }
      const ed = editDataRef.current
      const startFrac = ed?.soundStartFrac ?? 0
      const sndStart = audio.duration ? startFrac * audio.duration : 0
      const targetAudioTime = sndStart + (ed?.soundOffset ?? 0) + vid.currentTime
      if (Math.abs(audio.currentTime - targetAudioTime) > 0.3) audio.currentTime = targetAudioTime
      if (audio.paused) audio.play().catch(() => {})
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [msgHasEditPlayback, msgEditMeta.soundUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Debug log - important for troubleshooting action buttons
  console.log('MessageReelViewer - metadataReelId:', metadataReelId, 'resolvedReelId:', resolvedReelId, 'effectiveReelId:', reelId, 'isPartyInvite:', isPartyInvite)
  if (!reelId && (isSharedReel || isPartyInvite)) {
    console.warn('⚠️ No reelId available yet - likes/comments will not save until reel ID is resolved')
  }

  // Get stats for current reel (from local state or from reel data)
  const reelData = currentMessage?.reel || currentMessage?.metadata?.reel || {}
  const defaultStats = {
    likes: reelData.likeCount || reelData.stats?.likes || 0,
    comments: reelData.commentCount || reelData.stats?.comments || 0,
    isLiked: reelData.isLiked || false,
    reposts: reelData.repostCount || reelData.stats?.reposts || 0,
    isReposted: reelData.isReposted || false
  }
  const messageStats = localStats[reelId || currentMessage.id] || defaultStats

  const mockReel = {
    id: reelId, // Use the reel ID if available
    videoUrl: videoUrl,
    thumbnail: thumbnail,
    user: user,
    isMirrored: isMirrored,
    isLiked: messageStats.isLiked,
    isReposted: messageStats.isReposted,
    stats: {
      reposts: messageStats.reposts.toString(),
      likes: messageStats.likes.toString(),
      comments: messageStats.comments.toString(),
      shares: reelData.shareCount?.toString() || '0'
    }
  }

  // Consistent key for localStats - prefer reelId if available
  const statsKey = reelId || currentMessage?.id

  // Handle like change from ReelActions
  const handleLocalLikeChange = (changedReelId, liked) => {
    const stateKey = statsKey
    console.log('Like change - key:', stateKey, 'liked:', liked)
    setLocalStats(prev => {
      const current = prev[stateKey] || defaultStats
      const newLikes = liked ? (current.likes || 0) + 1 : Math.max(0, (current.likes || 0) - 1)
      const updated = {
        ...prev,
        [stateKey]: { ...current, likes: newLikes, isLiked: liked }
      }
      console.log('Updated localStats:', updated)
      return updated
    })
    // Also propagate to parent if provided
    if (changedReelId) {
      onLikeChange?.(changedReelId, liked)
    }
  }

  // Handle repost change from ReelActions
  const handleLocalRepostChange = (changedReelId, reposted) => {
    const stateKey = statsKey
    console.log('Repost change - key:', stateKey, 'reposted:', reposted)
    setLocalStats(prev => {
      const current = prev[stateKey] || defaultStats
      const newReposts = reposted ? (current.reposts || 0) + 1 : Math.max(0, (current.reposts || 0) - 1)
      return {
        ...prev,
        [stateKey]: { ...current, reposts: newReposts, isReposted: reposted }
      }
    })
  }

  // Handle comment added from CommentsSection
  const handleLocalCommentAdded = () => {
    const stateKey = statsKey
    console.log('Comment added - key:', stateKey)
    setLocalStats(prev => {
      const current = prev[stateKey] || defaultStats
      const updated = {
        ...prev,
        [stateKey]: { ...current, comments: (current.comments || 0) + 1 }
      }
      console.log('Updated localStats:', updated)
      return updated
    })
    // Also propagate to parent if provided
    onCommentAdded?.()
  }

  const getTitle = () => {
    if (isPartyInvite) {
      return currentMessage.metadata.partyName
    }
    return ''
  }

  const getCaption = () => {
    if (isPartyInvite) {
      return currentMessage.isOwn
        ? 'You sent an invite'
        : `${senderUser?.username || 'Someone'} invited you to join as ${currentMessage.metadata.role === 'admin' ? 'an Admin' : 'a Member'}`
    }
    return ''
  }

  // Render text with styled @mentions (for text overlays)
  const renderTextWithMentions = (text, mentions) => {
    if (!mentions || mentions.length === 0) return text
    const parts = []
    let remaining = text
    for (const mention of mentions) {
      const marker = `@${mention.username}`
      const idx = remaining.indexOf(marker)
      if (idx === -1) continue
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), type: 'plain' })
      parts.push({ text: marker, type: mention.type, mention })
      remaining = remaining.slice(idx + marker.length)
    }
    if (remaining) parts.push({ text: remaining, type: 'plain' })
    if (parts.length === 0) return text
    return parts.map((part, i) => {
      if (part.type === 'nominate') return (
        <span key={i} className="mention-nominate clickable" onClick={(e) => {
          e.stopPropagation()
          onClose()
          onOpenProfile?.({ id: part.mention?.userId, username: part.mention?.username })
        }}>{part.text}</span>
      )
      if (part.type === 'tag') return (
        <span key={i} className="mention-tag clickable" onClick={(e) => {
          e.stopPropagation()
          onClose()
          onOpenProfile?.({ id: part.mention?.userId, username: part.mention?.username })
        }}>{part.text}</span>
      )
      return <span key={i}>{part.text}</span>
    })
  }

  return createPortal(
    <div
      className="reel-card"
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        zIndex: 10001,
      }}
    >
      {/* Video/Media Background */}
      {videoUrl && !videoError ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className={`reel-media-video ${isMirrored ? 'mirrored' : ''}`}
            loop={!msgHasEditPlayback}
            playsInline
            onCanPlay={() => {
              console.log('Video can play, starting playback')
              setVideoReady(true)
              if (videoRef.current) {
                // Quote posts: mute main video (edit screen plays quoted reel muted, selfie has audio)
                if (msgEditMeta.quotedReelVideoUrl) {
                  videoRef.current.volume = 0
                  videoRef.current.muted = true
                } else {
                  videoRef.current.volume = (msgEditMeta.videoVolume ?? 100) / 100
                }
                videoRef.current.play().catch(err => console.log('Video play error:', err))
              }
            }}
            onError={(e) => {
              console.log('Video load error, falling back to thumbnail:', e)
              setVideoError(true)
            }}
            onClick={() => {
              // Manual play/pause on tap
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play().catch(err => console.log('Manual play error:', err))
                  if (soundAudioRef.current) soundAudioRef.current.play().catch(() => {})
                } else {
                  videoRef.current.pause()
                  if (soundAudioRef.current) soundAudioRef.current.pause()
                }
              }
            }}
          />
          {/* Loading indicator while video loads */}
          {!videoReady && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '14px',
              background: 'rgba(0,0,0,0.5)',
              padding: '12px 20px',
              borderRadius: '8px'
            }}>
              Loading video...
            </div>
          )}
        </>
      ) : thumbnail ? (
        <div
          className="reel-media"
          style={{ backgroundImage: `url(${thumbnail})` }}
        />
      ) : (
        <div className="reel-media" style={{ background: '#1a1a1a' }} />
      )}

      {/* Selfie overlay from message metadata */}
      {currentMessage?.metadata?.showSelfieOverlay && currentMessage?.metadata?.selfieSize && videoUrl && (
        <div
          className="reel-selfie-overlay"
          style={{
            width: currentMessage.metadata.selfieSize.w,
            height: currentMessage.metadata.selfieSize.h,
            left: currentMessage.metadata.selfiePosition?.x || 16,
            top: currentMessage.metadata.selfiePosition?.y || 80,
          }}
        >
          <video
            src={currentMessage.metadata.selfieVideoUrl || videoUrl}
            className={currentMessage.metadata.selfieIsMirrored ?? isMirrored ? 'mirrored' : ''}
            autoPlay
            loop
            muted={!currentMessage?.metadata?.quotedReelVideoUrl}
            playsInline
          />
        </div>
      )}

      {/* Text overlays from message metadata */}
      {currentMessage?.metadata?.textOverlays?.map((textItem, idx) => (
        <div
          key={`msg-text-${textItem.id || idx}-${idx}`}
          className="reel-text-overlay"
          style={{ left: textItem.x, top: textItem.y }}
        >
          <span className="reel-text-content">
            {renderTextWithMentions(textItem.text, textItem.mentions)}
          </span>
        </div>
      ))}

      {/* Overlay - same structure as ReelCard but no nav bar so less bottom padding */}
      <div className="reel-overlay" style={{ paddingBottom: '20px' }}>
        {/* Close button - absolutely positioned */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '40px',
            height: '40px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Right side actions - only for shared reels and party invites with a valid reel ID */}
        {!isDirectVideo && reelId && (
          <div className="reel-actions-container">
            <ReelActions
              user={user}
              stats={mockReel.stats}
              onOpenComments={() => setShowComments(true)}
              reel={mockReel}
              onTrackActivity={onTrackActivity}
              onLikeChange={handleLocalLikeChange}
              onRepostChange={handleLocalRepostChange}
            />
          </div>
        )}

        {/* Bottom section wrapper */}
        <div className="reel-bottom-wrapper" style={{ marginTop: 'auto' }}>
          {/* Sound name marquee */}
          {(currentMessage?.metadata?.soundName || currentMessage?.reel?.soundName || currentMessage?.reel?.metadata?.soundName) && (
            <div className="reel-sound-marquee">
              <svg className="reel-sound-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <div className="reel-sound-marquee-track">
                <span className="reel-sound-marquee-text">
                  {currentMessage?.metadata?.soundName || currentMessage?.reel?.soundName || currentMessage?.reel?.metadata?.soundName}
                </span>
              </div>
            </div>
          )}
          {/* Bottom info */}
          <div className="reel-bottom" style={{ marginTop: 0 }}>
            <div className="reel-info">
            {/* Direct video - minimal UI: just avatar + username */}
            {isDirectVideo ? (
              <div className="reel-user-row">
                <img
                  src={user.avatar || 'https://i.pravatar.cc/40?img=1'}
                  alt={user.username}
                  className="reel-user-avatar"
                  style={{ borderColor: getPartyColor(user.party) }}
                />
                <div className="reel-user-details">
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Sent from</span>
                  <span className="username">{user.username}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Join Party button - party invites only */}
                {isPartyInvite && !currentMessage.isOwn && (() => {
                  const partyId = currentMessage.metadata.partyId
                  const status = joinStatus[partyId] || 'idle'
                  const isAdmin = currentMessage.metadata.role === 'admin'

                  const handleJoinParty = async () => {
                    if (!partyId || status === 'joining' || status === 'joined') return

                    setJoinStatus(prev => ({ ...prev, [partyId]: 'joining' }))

                    try {
                      console.log('Joining party:', partyId, 'as admin:', isAdmin)
                      const response = await partiesApi.joinParty(partyId, { asAdmin: isAdmin })
                      console.log('Join response:', response)

                      const result = response.data || response

                      if (result.joined) {
                        setJoinStatus(prev => ({ ...prev, [partyId]: 'joined' }))
                        onAcceptInvite?.(currentMessage)
                      } else if (result.requested) {
                        setJoinStatus(prev => ({ ...prev, [partyId]: 'requested' }))
                      }
                    } catch (error) {
                      console.error('Failed to join party:', error)
                      setJoinStatus(prev => ({ ...prev, [partyId]: 'idle' }))
                    }
                  }

                  return (
                    <button
                      className="join-party-btn"
                      onClick={handleJoinParty}
                      disabled={status === 'joining' || status === 'joined'}
                      style={{
                        marginBottom: '12px',
                        alignSelf: 'flex-start',
                        background: status === 'joined'
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                          : status === 'requested'
                            ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                            : 'linear-gradient(135deg, #00F2EA 0%, #FF2A55 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '11px 16px',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: status === 'joining' || status === 'joined' ? 'default' : 'pointer',
                        opacity: status === 'joining' ? 0.7 : 1,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      {status === 'joining' ? (
                        'Joining...'
                      ) : status === 'joined' ? (
                        'Joined!'
                      ) : status === 'requested' ? (
                        'Request Sent'
                      ) : (
                        isAdmin ? 'Join as Admin' : 'Join Party'
                      )}
                    </button>
                  )
                })()}

                {/* Target Race Pill - shared reels */}
                {isSharedReel && currentMessage.metadata?.targetRace && (
                  <button className="reel-target-pill" style={{ marginBottom: '6px' }}>
                    <span className="target-pill-dot"></span>
                    {currentMessage.metadata.targetRace}
                  </button>
                )}

                {/* User row with clickable party tag */}
                <div className="reel-user-row">
                  <img
                    src={user.avatar || 'https://i.pravatar.cc/40?img=1'}
                    alt={user.username}
                    className="reel-user-avatar clickable"
                    style={{ borderColor: getPartyColor(user.party) }}
                    onClick={() => { onClose(); onOpenProfile?.(currentMessage.metadata?.user || { username: user.username, avatar: user.avatar }) }}
                  />
                  <div className="reel-user-details">
                    {user.party ? (
                      <button className="party-tag clickable" onClick={() => { onClose(); onOpenPartyProfile?.(user.party) }}>
                        {user.party}
                      </button>
                    ) : (
                      <span className="party-tag">Independent</span>
                    )}
                    <button className="username clickable" onClick={() => { onClose(); onOpenProfile?.(currentMessage.metadata?.user || { username: user.username, avatar: user.avatar }) }}>
                      {user.username}
                    </button>
                  </div>
                </div>

                {/* Title - shared reels use metadata.title, party invites use getTitle() */}
                {(isSharedReel && currentMessage.metadata?.title) ? (
                  <p className="reel-title">{currentMessage.metadata.title}</p>
                ) : getTitle() ? (
                  <p className="reel-title">{getTitle()}</p>
                ) : null}

                {/* Description/Caption - shared reels use metadata.caption, party invites use getCaption() */}
                {(isSharedReel && currentMessage.metadata?.caption && currentMessage.metadata.caption !== 'Shared a reel' && currentMessage.metadata.caption !== 'Sent a video') ? (
                  <p className="reel-caption">{currentMessage.metadata.caption}</p>
                ) : getCaption() ? (
                  <p className="reel-caption">{getCaption()}</p>
                ) : null}
              </>
            )}
          </div>

          {/* Nominate button - for shared reels and party invites */}
          {(isSharedReel || (isPartyInvite && !currentMessage.isOwn)) && (
            <button
              className="nominate-btn"
              onClick={() => {
                console.log('Nominate clicked')
                onTrackActivity?.('nominate', currentMessage)
              }}
            >
              <span>Nominate</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Comments Section - only for shared reels and party invites with a valid reel ID */}
      {showComments && !isDirectVideo && reelId && (
        <CommentsSection
          reel={mockReel}
          onClose={() => setShowComments(false)}
          onCommentAdded={handleLocalCommentAdded}
          onTrackActivity={onTrackActivity}
        />
      )}
    </div>,
    document.body
  )
}

export default MessageReelViewer
