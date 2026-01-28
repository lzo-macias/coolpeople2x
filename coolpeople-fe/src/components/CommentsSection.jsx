import { useState, useRef, useEffect } from 'react'
import '../styling/CommentsSection.css'
import Comment from './Comment'
import { mockComments } from '../data/mockData'
import { commentsApi } from '../services/api'

function CommentsSection({ reel, onClose, onUsernameClick, onPartyClick }) {
  const [dividerAtBottom, setDividerAtBottom] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const dragStartY = useRef(0)
  const inputRef = useRef(null)
  const commentsContainerRef = useRef(null)

  const mockBaseComments = mockComments['reel-1'] || { cpComments: [], regularComments: [] }
  const [apiComments, setApiComments] = useState(null)
  const [userComments, setUserComments] = useState([])
  const [commentReplies, setCommentReplies] = useState({})
  const [replyingTo, setReplyingTo] = useState(null) // { commentId, username }
  const [isLoading, setIsLoading] = useState(false)

  // Fetch comments from API
  useEffect(() => {
    const fetchComments = async () => {
      if (!reel?.id) return
      setIsLoading(true)
      try {
        const response = await commentsApi.getComments(reel.id)
        if (response.data && response.data.length > 0) {
          // Transform API response to match expected format
          const cpComments = response.data
            .filter(c => c.isVerified)
            .map(c => ({
              id: c.id,
              userId: c.user?.id,
              username: c.user?.username,
              avatar: c.user?.avatarUrl,
              party: c.user?.party,
              profileType: c.user?.isCandidate ? 'candidate' : 'participant',
              text: c.text,
              likes: c.likeCount || 0,
              isCP: true,
              replies: [],
              createdAt: c.createdAt,
            }))
          const regularComments = response.data
            .filter(c => !c.isVerified)
            .map(c => ({
              id: c.id,
              userId: c.user?.id,
              username: c.user?.username,
              avatar: c.user?.avatarUrl,
              party: c.user?.party,
              profileType: c.user?.isCandidate ? 'candidate' : 'participant',
              text: c.text,
              likes: c.likeCount || 0,
              isCP: false,
              replies: [],
              createdAt: c.createdAt,
            }))
          setApiComments({ cpComments, regularComments })
        }
      } catch (error) {
        console.log('Using mock comments:', error.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchComments()
  }, [reel?.id])

  // Use API comments if available, otherwise use mock
  const baseComments = apiComments || mockBaseComments

  const handleReply = (commentId, username) => {
    setReplyingTo({ commentId, username })
    setCommentText(`@${username} `)
    inputRef.current?.focus()
  }

  const handleSendComment = async () => {
    if (commentText.trim()) {
      const newId = `user-${Date.now()}`
      const text = commentText
      setCommentText('') // Clear immediately for better UX

      if (replyingTo) {
        // Adding a reply to a comment
        const newReply = {
          id: newId,
          username: 'You',
          avatar: 'https://i.pravatar.cc/40?img=20',
          text: text,
          likes: 0,
          party: null
        }
        setCommentReplies(prev => ({
          ...prev,
          [replyingTo.commentId]: [...(prev[replyingTo.commentId] || []), newReply]
        }))
        setReplyingTo(null)

        // Scroll to the reply after a brief delay
        setTimeout(() => {
          const replyElement = document.getElementById(newId)
          replyElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)

        // Sync with API
        try {
          if (reel?.id) {
            await commentsApi.addComment(reel.id, {
              text: text,
              parentId: replyingTo.commentId,
            })
          }
        } catch (error) {
          console.log('Add reply error:', error.message)
        }
      } else {
        // Adding a new top-level comment
        const newComment = {
          id: newId,
          username: 'You',
          avatar: 'https://i.pravatar.cc/40?img=20',
          text: text,
          likes: 0,
          party: null,
          profileType: 'participant'
        }
        setUserComments([...userComments, newComment])

        // Scroll to the new comment
        setTimeout(() => {
          const commentElement = document.getElementById(newId)
          commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)

        // Sync with API
        try {
          if (reel?.id) {
            await commentsApi.addComment(reel.id, { text: text })
          }
        } catch (error) {
          console.log('Add comment error:', error.message)
        }
      }
    }
  }

  const comments = {
    cpComments: baseComments.cpComments,
    regularComments: [...baseComments.regularComments, ...userComments]
  }

  // Handle drag to close
  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - dragStartY.current
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > 150) {
      onClose()
    }
    setDragY(0)
  }

  // Mouse drag support
  const handleMouseDown = (e) => {
    dragStartY.current = e.clientY
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const diff = e.clientY - dragStartY.current
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (dragY > 150) {
      onClose()
    }
    setDragY(0)
  }

  const handleDividerClick = () => {
    setDividerAtBottom(!dividerAtBottom)
  }

  return (
    <div
      className="comments-section"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Video preview - click to close */}
      <div className="comments-video-preview" onClick={onClose}>
        {reel?.videoUrl ? (
          <video
            src={reel.videoUrl}
            className={`video-thumbnail-video ${reel.isMirrored ? 'mirrored' : ''}`}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div
            className="video-thumbnail"
            style={{ backgroundImage: `url(${reel?.thumbnail})` }}
          />
        )}
      </div>

      {/* Comments container */}
      <div className="comments-container" ref={commentsContainerRef}>
        {/* CP Comments section - always show */}
        <div className="cp-comments-section">
          {comments.cpComments.map((comment, index) => (
            <div key={comment.id} className="cp-comment-wrapper">
              <Comment
                comment={comment}
                isCP={true}
                onUsernameClick={onUsernameClick}
                onPartyClick={onPartyClick}
                onReply={handleReply}
                userReplies={commentReplies[comment.id] || []}
              />
              {index === comments.cpComments.length - 1 && (
                <span className="leave-verified-comment" onClick={() => setShowPaywall(true)}>leave a verified comment</span>
              )}
            </div>
          ))}
        </div>

        {/* CP Divider - gradient line (at top position) */}
        {!dividerAtBottom && (
          <div className="cp-divider" onClick={handleDividerClick}>
            <div className="cp-divider-line">
              <span className="cp-divider-text-bg">
                <span className="cp-divider-text"><span className="cp-c">C</span><span className="cp-p">P</span></span>
              </span>
            </div>
          </div>
        )}

        {/* Regular comments - only show when divider is at top */}
        {!dividerAtBottom && (
          <div className="regular-comments-section">
            {comments.regularComments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                isCP={false}
                onUsernameClick={onUsernameClick}
                onPartyClick={onPartyClick}
                onReply={handleReply}
                userReplies={commentReplies[comment.id] || []}
              />
            ))}
          </div>
        )}

        {/* CP Divider at bottom when toggled */}
        {dividerAtBottom && (
          <div className="cp-divider cp-divider-bottom" onClick={handleDividerClick}>
            <div className="cp-divider-line">
              <span className="cp-divider-text-bg">
                <span className="cp-divider-text"><span className="cp-c">C</span><span className="cp-p">P</span></span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Comment input */}
      <div className="comment-input-container">
        <img
          src="https://i.pravatar.cc/40?img=20"
          alt="Your avatar"
          className="input-avatar"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="add a comment"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendComment()
          }}
          className="comment-input"
        />
        <button
          className={`send-btn ${commentText.trim() ? 'active' : ''}`}
          onClick={handleSendComment}
        >
          <span className="send-arrow">↑</span>
        </button>
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div className="paywall-overlay" onClick={() => setShowPaywall(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>
            <div className="paywall-icon">🔒</div>
            <h3 className="paywall-title">Verified Comments</h3>
            <p className="paywall-text">
              Leaving verified comments is a premium feature. Upgrade to join the conversation with verified users.
            </p>
            <button className="paywall-btn">Upgrade Now</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentsSection
