import { useState } from 'react'
import '../styling/Comment.css'
import { getPartyColor } from '../data/mockData'

function Comment({ comment, isCP = false, onUsernameClick, onPartyClick }) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.likes)
  const partyColor = getPartyColor(comment.party)
  const partyDisplay = comment.party || 'Independent'

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

  return (
    <div className={`comment ${isCP ? 'cp-comment' : ''}`}>
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
          <button
            className="comment-party-btn"
            onClick={handlePartyClick}
            disabled={!comment.party}
          >
            {partyDisplay}
          </button>
        </div>
        <p className="comment-text">{comment.text}</p>
        <div className="comment-actions">
          <button className="comment-action-btn">reply</button>
          <button className="comment-action-btn">see replies</button>
        </div>
      </div>
      <div className="comment-likes">
        <button className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? '#ff6b9d' : 'none'} stroke={isLiked ? '#ff6b9d' : 'currentColor'} strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <span className="likes-count">{likeCount}</span>
      </div>
    </div>
  )
}

export default Comment
