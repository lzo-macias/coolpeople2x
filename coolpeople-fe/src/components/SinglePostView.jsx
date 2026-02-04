import { useState, useRef, useEffect } from 'react'
import ReelCard from './ReelCard'
import '../styling/SinglePostView.css'

function SinglePostView({
  posts,
  initialIndex = 0,
  onClose,
  onEndReached,
  onUsernameClick,
  onPartyClick,
  onOpenComments,
  onLikeChange,
  onTrackActivity,
  onCommentAdded,
  engagementScores,
  profileName = 'Profile'
}) {
  const containerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showEndIndicator, setShowEndIndicator] = useState(false)
  const lastScrollTop = useRef(0)
  const endReachedTriggered = useRef(false)

  // Scroll to initial post on mount
  useEffect(() => {
    if (containerRef.current && initialIndex > 0) {
      const postHeight = window.innerHeight
      containerRef.current.scrollTo({
        top: initialIndex * postHeight,
        behavior: 'instant'
      })
    }
  }, [initialIndex])

  // Handle scroll to track current post and detect end
  const handleScroll = () => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const postHeight = window.innerHeight
    const newIndex = Math.round(scrollTop / postHeight)

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
    }

    // Check if scrolled past last post
    const maxScroll = (posts.length - 1) * postHeight
    const overscroll = scrollTop - maxScroll

    if (scrollTop > lastScrollTop.current && newIndex >= posts.length - 1) {
      // Scrolling down past last post
      if (overscroll > 100) {
        setShowEndIndicator(true)
        if (overscroll > 150 && !endReachedTriggered.current) {
          endReachedTriggered.current = true
          onEndReached?.()
        }
      }
    } else {
      setShowEndIndicator(false)
      endReachedTriggered.current = false
    }

    lastScrollTop.current = scrollTop
  }

  return (
    <div className="single-post-view">
      {/* Header - just back button */}
      <div className="single-post-header">
        <button className="single-post-back" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Posts Container */}
      <div
        className="single-post-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {posts.map((post, index) => {
          const enrichedPost = post.engagementScores ? post : { ...post, engagementScores }
          return (
          <div key={post.id || index} className="single-post-item">
            <ReelCard
              reel={enrichedPost}
              isPageActive={Math.abs(index - currentIndex) <= 1}
              onUsernameClick={onUsernameClick}
              onPartyClick={onPartyClick}
              onOpenComments={() => onOpenComments?.(post)}
              onLikeChange={onLikeChange}
              onTrackActivity={onTrackActivity}
            />
          </div>
          )
        })}

        {/* End spacer for overscroll detection */}
        <div className="single-post-end-spacer">
          <div className={`end-indicator ${showEndIndicator ? 'visible' : ''}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span>Back to {profileName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SinglePostView
