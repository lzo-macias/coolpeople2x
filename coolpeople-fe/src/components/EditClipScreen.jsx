import { useState } from 'react'
import AddSound from './AddSound'
import '../styling/EditClipScreen.css'

function EditClipScreen({ onClose, onNext, selectedSound, onSelectSound }) {
  const [showAddSound, setShowAddSound] = useState(false)

  return (
    <div className="edit-clip-screen">
      {/* Video Preview */}
      <div className="edit-clip-preview">
        <img
          src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop"
          alt="Clip preview"
        />
      </div>

      {/* Top Controls */}
      <div className="edit-clip-top">
        <button className="edit-clip-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="edit-clip-sound-btn" onClick={() => setShowAddSound(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{selectedSound ? selectedSound.name : 'add sound'}</span>
        </button>

        <div className="edit-clip-side-controls">
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom */}
      <div className="edit-clip-bottom">
        <button className="edit-clip-story-btn">
          <img
            src="https://i.pravatar.cc/40?img=3"
            alt="Profile"
            className="edit-clip-story-avatar"
          />
          <span>your story</span>
        </button>
        <button className="edit-clip-next-btn" onClick={onNext}>
          next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Add Sound Screen */}
      {showAddSound && (
        <AddSound
          onClose={() => setShowAddSound(false)}
          onSelectSound={(sound) => {
            onSelectSound?.(sound)
            setShowAddSound(false)
          }}
        />
      )}
    </div>
  )
}

export default EditClipScreen
