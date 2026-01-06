import { useState, useRef } from 'react'
import '../styling/CommentsSection.css'
import Comment from './Comment'
import EngagementScoreBar from './EngagementScoreBar'
import { mockComments } from '../data/mockData'

// CP divider states: 'expanded' (show all CP), 'collapsed' (show 1 CP), 'hidden' (divider at bottom)
const DIVIDER_STATES = ['expanded', 'collapsed', 'hidden']

function CommentsSection({ reel, onClose }) {
  const [dividerState, setDividerState] = useState('expanded')
  const [commentText, setCommentText] = useState('')
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  const comments = mockComments['reel-1'] || { cpComments: [], regularComments: [] }

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
    const currentIndex = DIVIDER_STATES.indexOf(dividerState)
    const nextIndex = (currentIndex + 1) % DIVIDER_STATES.length
    setDividerState(DIVIDER_STATES[nextIndex])
  }

  const visibleCPComments = dividerState === 'expanded'
    ? comments.cpComments
    : dividerState === 'collapsed'
      ? comments.cpComments.slice(0, 1)
      : []

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
        <EngagementScoreBar scores={reel?.engagementScores} />
        <div
          className="video-thumbnail"
          style={{ backgroundImage: `url(${reel?.thumbnail})` }}
        >
          {/* <span className="cp-badge">CP</span> */}
        </div>
      </div>

      {/* Comments container */}
      <div className="comments-container">
        {/* CP Comments section */}
        {dividerState !== 'hidden' && (
          <div className="cp-comments-section">
            {visibleCPComments.map((comment, index) => (
              <div key={comment.id} className="cp-comment-wrapper">
                <Comment comment={comment} isCP={true} />
                {index === visibleCPComments.length - 1 && (
                  <span className="leave-verified-comment">leave a verified comment</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CP Divider - gradient line */}
        <div className="cp-divider" onClick={handleDividerClick}>
          <div className="cp-divider-line">
            <span className="cp-divider-text-bg">
              <span className="cp-divider-text">CP</span>
            </span>
          </div>
        </div>

        {/* Regular comments */}
        <div className="regular-comments-section">
          {comments.regularComments.map((comment) => (
            <Comment key={comment.id} comment={comment} isCP={false} />
          ))}
        </div>
      </div>

      {/* Comment input */}
      <div className="comment-input-container">
        <img
          src="https://i.pravatar.cc/40?img=20"
          alt="Your avatar"
          className="input-avatar"
        />
        <input
          type="text"
          placeholder="add a comment"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="comment-input"
        />
        <div className="input-actions">
          <button className="input-action-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <button className="input-action-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" />
              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
            </svg>
          </button>
          <button className="input-action-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommentsSection
