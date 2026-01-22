import { useState, useEffect } from 'react'
import '../styling/Comment.css'
import { getPartyColor } from '../data/mockData'

// Mock replies for comments
const mockReplies = [
  { id: 'r1', username: 'Alex.V', avatar: 'https://i.pravatar.cc/40?img=11', text: 'Totally agree with this!', likes: 5, party: 'Democrat' },
  { id: 'r2', username: 'Jordan.K', avatar: 'https://i.pravatar.cc/40?img=12', text: 'Great point, well said.', likes: 3, party: null },
  { id: 'r3', username: 'Sam.Politics', avatar: 'https://i.pravatar.cc/40?img=13', text: 'This is the kind of discourse we need.', likes: 8, party: 'The Pink Lady Party' },
]

function Comment({ comment, isCP = false, onUsernameClick, onPartyClick, onReply, onPaywall, userReplies = [] }) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.likes)
  const [showReplies, setShowReplies] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const partyColor = getPartyColor(comment.party)
  const partyDisplay = comment.party || 'Independent'

  // Combine mock replies with user replies
  const allReplies = [...mockReplies, ...userReplies]

  // Auto-expand replies when user adds a new one
  useEffect(() => {
    if (userReplies.length > 0) {
      setShowReplies(true)
    }
  }, [userReplies.length])

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(likeCount - 1)
    } else {
      setLikeCount(likeCount + 1)
    }
    setIsLiked(!isLiked)
  }

  const handleUsernameClick = () => {
    onUsernameClick?.(comment)
  }

  const handlePartyClick = () => {
    if (comment.party) {
      onPartyClick?.(comment.party)
    }
  }

  const handleReplyClick = (username) => {
    if (isCP) {
      setShowPaywall(true)
    } else {
      onReply?.(comment.id, username)
    }
  }

  return (
    <div id={comment.id} className={`comment ${isCP ? 'cp-comment' : ''}`}>
      <img
        src={comment.avatar}
        alt={comment.username}
        className="comment-avatar"
        style={{ borderColor: partyColor }}
        onClick={handleUsernameClick}
      />
      <div className="comment-content">
        <div className="comment-header">
          <button className="comment-username-btn" onClick={handleUsernameClick}>
            {comment.username}
          </button>
          {comment.party && (
            <button
              className="comment-party-btn"
              onClick={handlePartyClick}
            >
              {comment.party}
            </button>
          )}
        </div>
        <p className="comment-text">{comment.text}</p>
        <div className="comment-actions">
          <button
            className="comment-action-btn"
            onClick={() => handleReplyClick(comment.username)}
          >
            reply
          </button>
          <button
            className="comment-action-btn"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? 'hide replies' : `see replies (${allReplies.length})`}
          </button>
        </div>

        {/* Paywall modal for CP replies */}
        {showPaywall && (
          <div className="paywall-overlay" onClick={() => setShowPaywall(false)}>
            <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
              <button className="paywall-close" onClick={() => setShowPaywall(false)}>×</button>
              <div className="paywall-icon">🔒</div>
              <h3 className="paywall-title">Verified Comments</h3>
              <p className="paywall-text">
                Replying to verified comments is a premium feature. Upgrade to join the conversation with verified users.
              </p>
              <button className="paywall-btn">Upgrade Now</button>
            </div>
          </div>
        )}

        {/* Replies list */}
        {showReplies && (
          <div className="replies-list">
            {allReplies.map((reply) => (
              <div key={reply.id} id={reply.id} className="reply">
                <img
                  src={reply.avatar}
                  alt={reply.username}
                  className="reply-avatar"
                  style={{ borderColor: getPartyColor(reply.party) }}
                />
                <div className="reply-content">
                  <div className="reply-header">
                    <span className="reply-username">{reply.username}</span>
                  </div>
                  <span className="reply-text">{reply.text}</span>
                  <div className="reply-actions">
                    <button
                      className="reply-action-btn"
                      onClick={() => handleReplyClick(reply.username)}
                    >
                      reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="comment-likes">
        <button className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? '#FF2A55' : 'none'} stroke={isLiked ? '#FF2A55' : 'currentColor'} strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <span className="likes-count">{likeCount}</span>
      </div>
    </div>
  )
}

export default Comment
