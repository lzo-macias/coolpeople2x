import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import '../styling/ReelCard.css'
import '../styling/ReelActions.css'
import ReelActions from './ReelActions'
import CommentsSection from './CommentsSection'
import { getPartyColor } from '../data/mockData'

function MessageReelViewer({ messages, initialMessageId, onClose, onAcceptInvite, senderUser, currentUserAvatar, onTrackActivity, onLikeChange, onCommentAdded }) {
  // Track video load errors to fallback to thumbnail
  const [videoError, setVideoError] = useState(false)

  // Filter messages with video content (party invites with videos or media messages)
  const videoMessages = messages.filter(msg => {
    if (msg.metadata?.type === 'party_invite') {
      // Support both base64 and URL formats, plus fallback to avatar
      return msg.metadata.introVideoBase64 || msg.metadata.introVideoUrl || msg.metadata.partyAvatar
    }
    return msg.mediaUrl && (msg.mediaType === 'video' || msg.mediaUrl.includes('.mp4') || msg.mediaUrl.includes('.webm'))
  })

  // Find initial index
  const initialIndex = videoMessages.findIndex(msg => msg.id === initialMessageId)
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0)
  const [showComments, setShowComments] = useState(false)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchDeltaY, setTouchDeltaY] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [localStats, setLocalStats] = useState({}) // Track local like/comment counts per message
  const containerRef = useRef(null)
  const videoRef = useRef(null)

  const currentMessage = videoMessages[currentIndex]
  const isPartyInvite = currentMessage?.metadata?.type === 'party_invite'

  // Track if video is ready to play
  const [videoReady, setVideoReady] = useState(false)

  // Reset video error when index changes
  useEffect(() => {
    setVideoError(false)
    setVideoReady(false)
  }, [currentIndex, currentMessage])

  // Handle swipe navigation
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e) => {
    const delta = e.touches[0].clientY - touchStartY
    setTouchDeltaY(delta)
  }

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaY) > 100) {
      if (touchDeltaY < 0 && currentIndex < videoMessages.length - 1) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1)
          setIsTransitioning(false)
        }, 200)
      } else if (touchDeltaY > 0 && currentIndex > 0) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentIndex(prev => prev - 1)
          setIsTransitioning(false)
        }, 200)
      } else if ((touchDeltaY > 0 && currentIndex === 0) || (touchDeltaY < 0 && currentIndex === videoMessages.length - 1)) {
        onClose()
      }
    }
    setTouchDeltaY(0)
  }

  // Handle scroll wheel for desktop
  const handleWheel = useCallback((e) => {
    if (isTransitioning || showComments) return

    if (e.deltaY > 50 && currentIndex < videoMessages.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setIsTransitioning(false)
      }, 200)
    } else if (e.deltaY < -50 && currentIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1)
        setIsTransitioning(false)
      }, 200)
    } else if ((e.deltaY < -50 && currentIndex === 0) || (e.deltaY > 50 && currentIndex === videoMessages.length - 1)) {
      onClose()
    }
  }, [currentIndex, videoMessages.length, isTransitioning, showComments, onClose])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const getVideoUrl = () => {
    if (isPartyInvite) {
      // Prefer base64 (persistent) over blob URL (session-only)
      return currentMessage.metadata.introVideoBase64 || currentMessage.metadata.introVideoUrl
    }
    return currentMessage?.mediaUrl
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

  if (!currentMessage || videoMessages.length === 0) {
    return null
  }

  const videoUrl = getVideoUrl()
  const thumbnail = getThumbnail()
  const user = getUser()
  const isMirrored = currentMessage.isMirrored || currentMessage.metadata?.introVideoMirrored

  // Debug log
  console.log('MessageReelViewer - videoUrl:', videoUrl?.substring(0, 100), 'videoError:', videoError, 'videoReady:', videoReady, 'hasBase64:', !!currentMessage.metadata?.introVideoBase64, 'thumbnail:', thumbnail?.substring(0, 50))

  // Get stats for current message (from local state or default to 0)
  const messageStats = localStats[currentMessage.id] || { likes: 0, comments: 0, isLiked: false }

  const mockReel = {
    id: currentMessage.id,
    videoUrl: videoUrl,
    thumbnail: thumbnail,
    user: user,
    isMirrored: isMirrored,
    isLiked: messageStats.isLiked,
    stats: {
      reposts: '0',
      likes: messageStats.likes.toString(),
      comments: messageStats.comments.toString(),
      shares: '0'
    }
  }

  // Handle like change from ReelActions
  const handleLocalLikeChange = (reelId, liked) => {
    setLocalStats(prev => {
      const current = prev[reelId] || { likes: 0, comments: 0, isLiked: false }
      const newLikes = liked ? current.likes + 1 : Math.max(0, current.likes - 1)
      return {
        ...prev,
        [reelId]: { ...current, likes: newLikes, isLiked: liked }
      }
    })
    // Also propagate to parent if provided
    onLikeChange?.(reelId, liked)
  }

  // Handle comment added from CommentsSection
  const handleLocalCommentAdded = () => {
    setLocalStats(prev => {
      const current = prev[currentMessage.id] || { likes: 0, comments: 0, isLiked: false }
      return {
        ...prev,
        [currentMessage.id]: { ...current, comments: current.comments + 1 }
      }
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

  return createPortal(
    <div
      className="reel-card"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
        transform: touchDeltaY !== 0 ? `translateY(${touchDeltaY * 0.3}px)` : 'none',
        transition: touchDeltaY === 0 ? 'transform 0.2s ease-out' : 'none'
      }}
    >
      {/* Video/Media Background */}
      {videoUrl && !videoError ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className={`reel-media-video ${isMirrored ? 'mirrored' : ''}`}
            loop
            playsInline
            muted
            onCanPlay={() => {
              console.log('Video can play, starting playback')
              setVideoReady(true)
              if (videoRef.current) {
                videoRef.current.play().catch(err => console.log('Video play error:', err))
              }
            }}
            onError={(e) => {
              console.log('Video load error, falling back to thumbnail:', e)
              setVideoError(true)
            }}
            onClick={() => {
              // Manual play on tap for browsers that block autoplay
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play().catch(err => console.log('Manual play error:', err))
                } else {
                  videoRef.current.pause()
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

        {/* Right side actions */}
        <div className="reel-actions-container">
          <ReelActions
            user={user}
            stats={mockReel.stats}
            onOpenComments={() => setShowComments(true)}
            reel={mockReel}
            onTrackActivity={onTrackActivity}
            onLikeChange={handleLocalLikeChange}
          />
        </div>

        {/* Bottom info - margin-top auto pushes to bottom */}
        <div className="reel-bottom" style={{ marginTop: 'auto' }}>
          <div className="reel-info">
            {/* Join as Admin button - above user row */}
            {isPartyInvite && !currentMessage.isOwn && (
              <button
                className="nominate-btn"
                onClick={() => {
                  onAcceptInvite?.(currentMessage)
                  onClose()
                }}
                style={{ marginBottom: '12px', alignSelf: 'flex-start' }}
              >
                <span>{currentMessage.metadata.role === 'admin' ? 'Join as Admin' : 'Join Party'}</span>
              </button>
            )}
            <div className="reel-user-row">
              <img
                src={user.avatar || 'https://i.pravatar.cc/40?img=1'}
                alt={user.username}
                className="reel-user-avatar"
                style={{ borderColor: getPartyColor(user.party) }}
              />
              <div className="reel-user-details">
                {user.party && (
                  <span className="party-tag">{user.party}</span>
                )}
                <span className="username">{user.username}</span>
              </div>
            </div>
            {getTitle() && <p className="reel-title">{getTitle()}</p>}
            {getCaption() && <p className="reel-caption">{getCaption()}</p>}
          </div>

          {/* Nominate button - right side */}
          {isPartyInvite && !currentMessage.isOwn && (
            <button
              className="nominate-btn"
              onClick={() => {
                // Nominate action - same as in regular reels
                console.log('Nominate clicked')
              }}
            >
              <span>Nominate</span>
            </button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
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
