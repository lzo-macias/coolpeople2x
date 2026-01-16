import { useState, useEffect } from 'react'
import '../styling/EditBio.css'

// Game types for icebreakers
const gameTypes = [
  {
    id: 'guessWhichTrue',
    name: 'Guess Which One is True',
    description: 'Add 3 statements - one is true, two are lies',
    icon: '🎯',
  },
  {
    id: 'wouldYouRather',
    name: 'Would You Rather',
    description: 'Give two options for others to choose between',
    icon: '⚖️',
  },
  {
    id: 'unpopularOpinion',
    name: 'Unpopular Opinion',
    description: 'Share a hot take others can agree or disagree with',
    icon: '🔥',
  },
]

// Available tags for "Topics that energize me"
const availableTags = [
  // Politics
  'Healthcare', 'Trans Rights', 'Immigration', 'Affordability', 'Education', 'Housing', 'Climate', 'Police Reform', 'Voting Rights', 'Labor',
  // Lifestyle
  'Fitness', 'Travel', 'Food', 'Music', 'Art', 'Fashion', 'Sports', 'Gaming',
  // Community
  'Volunteering', 'Local Events', 'Small Business', 'Sustainability', 'Mental Health', 'Parenting',
  // Tech & Career
  'Tech', 'Entrepreneurship', 'Finance', 'Networking'
]

function EditBio({ profileData: passedProfileData, onSave }) {
  // Convert passed profileData (from CandidateProfile format) to EditBio format
  const getInitialData = () => ({
    viewsOnIce: passedProfileData?.viewsOnIce?.score ?? 7,
    viewsOnTransRights: passedProfileData?.viewsOnTransRights?.score ?? 7,
    hillToDieOn: passedProfileData?.hillToDieOn?.content ?? '',
    topicsThatEnergize: passedProfileData?.topicsThatEnergize?.tags ?? [],
    accomplishment: passedProfileData?.accomplishment?.content ?? '',
    guessWhichTrue: {
      options: passedProfileData?.guessWhichTrue?.options ?? ['', '', ''],
      correctIndex: passedProfileData?.guessWhichTrue?.correctIndex ?? null,
    },
    wouldYouRather: {
      optionA: '',
      optionB: '',
    },
    unpopularOpinion: {
      opinion: '',
    },
  })

  // Profile sections state - matches CandidateProfile profileSections
  const [profileData, setProfileData] = useState(getInitialData)

  // Modal state
  const [activeModal, setActiveModal] = useState(null) // 'hillToDieOn', 'accomplishment', 'guessWhichTrue', 'topicsThatEnergize', 'gameSelect', 'wouldYouRather', 'unpopularOpinion'

  const handleSliderChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: parseInt(value) }))
  }

  const handleTextChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleTagToggle = (tag) => {
    setProfileData(prev => ({
      ...prev,
      topicsThatEnergize: prev.topicsThatEnergize.includes(tag)
        ? prev.topicsThatEnergize.filter(t => t !== tag)
        : [...prev.topicsThatEnergize, tag]
    }))
  }

  const handleGuessOptionChange = (index, value) => {
    setProfileData(prev => ({
      ...prev,
      guessWhichTrue: {
        ...prev.guessWhichTrue,
        options: prev.guessWhichTrue.options.map((opt, i) => i === index ? value : opt)
      }
    }))
  }

  const handleCorrectIndexChange = (index) => {
    setProfileData(prev => ({
      ...prev,
      guessWhichTrue: {
        ...prev.guessWhichTrue,
        correctIndex: index
      }
    }))
  }

  const openModal = (type) => {
    setActiveModal(type)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  // Calculate completion
  const filledCount = [
    profileData.viewsOnIce !== null,
    profileData.viewsOnTransRights !== null,
    profileData.hillToDieOn.trim() !== '',
    profileData.topicsThatEnergize.length > 0,
    profileData.accomplishment.trim() !== '',
    profileData.guessWhichTrue.options.some(o => o.trim() !== '') && profileData.guessWhichTrue.correctIndex !== null,
  ].filter(Boolean).length

  const canSend = filledCount >= 1

  // Get color from gradient based on position (0-10 score)
  const getScoreColor = (score) => {
    if (score === null) return '#888888'
    const position = score / 10
    if (position <= 0.5) {
      const t = position * 2
      const r = Math.round(255 + (213 - 255) * t)
      const g = Math.round(23 + (0 - 23) * t)
      const b = Math.round(68 + (249 - 68) * t)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      const t = (position - 0.5) * 2
      const r = Math.round(213 + (0 - 213) * t)
      const g = Math.round(0 + (229 - 0) * t)
      const b = Math.round(249 + (255 - 249) * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  return (
    <div className="edit-bio">
      {/* Sliders Section */}
      <h3 className="section-title">SLIDERS</h3>
      <div className="political-sliders">
        <div className="slider-item">
          <p className="slider-label">My views on trans rights</p>
          <div className="slider-container">
            <div className="slider-gradient" />
            <input
              type="range"
              min="0"
              max="10"
              value={profileData.viewsOnTransRights ?? 5}
              onChange={(e) => handleSliderChange('viewsOnTransRights', e.target.value)}
              className="spectrum-slider"
            />
            {profileData.viewsOnTransRights !== null && (
              <div
                className="score-indicator"
                style={{
                  left: `${profileData.viewsOnTransRights * 10}%`,
                  background: getScoreColor(profileData.viewsOnTransRights)
                }}
              >
                <span className="score-value">{profileData.viewsOnTransRights}</span>
              </div>
            )}
          </div>
          <div className="slider-labels">
            <span>Conservative</span>
            <span>Progressive</span>
          </div>
        </div>

        <div className="slider-item">
          <p className="slider-label">My views on ICE</p>
          <div className="slider-container">
            <div className="slider-gradient" />
            <input
              type="range"
              min="0"
              max="10"
              value={profileData.viewsOnIce ?? 5}
              onChange={(e) => handleSliderChange('viewsOnIce', e.target.value)}
              className="spectrum-slider"
            />
            {profileData.viewsOnIce !== null && (
              <div
                className="score-indicator"
                style={{
                  left: `${profileData.viewsOnIce * 10}%`,
                  background: getScoreColor(profileData.viewsOnIce)
                }}
              >
                <span className="score-value">{profileData.viewsOnIce}</span>
              </div>
            )}
          </div>
          <div className="slider-labels">
            <span>Conservative</span>
            <span>Progressive</span>
          </div>
        </div>
      </div>

      {/* Icebreakers Section */}
      <div className="icebreakers-section">
        <h3 className="icebreakers-title">ICEBREAKERS</h3>

        {/* Written Category */}
        <div className="icebreaker-category">
          <span className="category-label">written</span>

          {/* The Hill I Will Die On */}
          {profileData.hillToDieOn && (
            <div
              className="icebreaker-card filled"
              onClick={() => openModal('hillToDieOn')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">The Hill I Will Die on</p>
                <p className="icebreaker-response">{profileData.hillToDieOn}</p>
              </div>
              <button className="edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          {/* One Accomplishment I'm Proud Of */}
          {profileData.accomplishment && (
            <div
              className="icebreaker-card filled"
              onClick={() => openModal('accomplishment')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">One accomplishment I'm proud of</p>
                <p className="icebreaker-response">{profileData.accomplishment}</p>
              </div>
              <button className="edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          {/* Empty card to add new written icebreaker */}
          <div
            className="icebreaker-card"
            onClick={() => openModal(!profileData.hillToDieOn ? 'hillToDieOn' : !profileData.accomplishment ? 'accomplishment' : 'hillToDieOn')}
          >
            <div className="icebreaker-content">
              <p className="icebreaker-prompt">Select an icebreaker</p>
              <p className="icebreaker-subtitle">Add your response</p>
            </div>
            <button className="add-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tags Category */}
        <div className="icebreaker-category">
          <span className="category-label">tags</span>

          {/* Topics That Energize Me */}
          {profileData.topicsThatEnergize.length > 0 && (
            <div
              className="icebreaker-card filled"
              onClick={() => openModal('topicsThatEnergize')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">Topics that energize me</p>
                <p className="icebreaker-response">{profileData.topicsThatEnergize.join(', ')}</p>
              </div>
              <button className="edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          {/* Empty card to add tags */}
          {profileData.topicsThatEnergize.length === 0 && (
            <div
              className="icebreaker-card"
              onClick={() => openModal('topicsThatEnergize')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">Topics that energize me</p>
                <p className="icebreaker-subtitle">Select your topics</p>
              </div>
              <button className="add-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Game Category */}
        <div className="icebreaker-category">
          <span className="category-label">game</span>

          {/* Guess Which One is True */}
          {profileData.guessWhichTrue.options.some(o => o) ? (
            <div
              className="icebreaker-card filled"
              onClick={() => openModal('guessWhichTrue')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">Guess Which One is True</p>
                <p className="icebreaker-response">{profileData.guessWhichTrue.options.filter(o => o).length} options added</p>
              </div>
              <button className="edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              className="icebreaker-card"
              onClick={() => openModal('guessWhichTrue')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">Guess Which One is True</p>
                <p className="icebreaker-subtitle">Add 3 options (1 true)</p>
              </div>
              <button className="add-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
            </div>
          )}

          {/* Empty card to add new game icebreaker */}
          <div className="icebreaker-card" onClick={() => openModal('gameSelect')}>
            <div className="icebreaker-content">
              <p className="icebreaker-prompt">Select a game</p>
              <p className="icebreaker-subtitle">Choose a game type</p>
            </div>
            <button className="add-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Video Category - hidden for now */}
        {/* <div className="icebreaker-category">
          <span className="category-label">video</span>
          <div className="icebreaker-card">
            <div className="icebreaker-content">
              <p className="icebreaker-prompt">Add a video icebreaker</p>
              <p className="icebreaker-subtitle">Record your response</p>
            </div>
            <button className="add-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div> */}
      </div>

      {/* Bottom Action Button */}
      <div className="bio-bottom-action">
        {canSend ? (
          <button className="send-btn" onClick={() => onSave?.(profileData)}>Save</button>
        ) : (
          <button className="skip-btn">skip</button>
        )}
      </div>

      {/* Text Input Modal (for hillToDieOn and accomplishment) */}
      {(activeModal === 'hillToDieOn' || activeModal === 'accomplishment') && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Write Ice-Breaker</h3>
            <button className="save-btn" onClick={closeModal}>Save</button>
          </div>
          <div className="write-modal-content">
            <div className="prompt-card">
              <p className="prompt-text">
                {activeModal === 'hillToDieOn'
                  ? 'the hill I will die on is'
                  : "one accomplishment I'm proud of is"}
              </p>
              {/* <button className="template-btn">choose<br/>from<br/>template</button> */}
            </div>
            <textarea
              className="response-input"
              placeholder="response"
              value={profileData[activeModal]}
              onChange={(e) => handleTextChange(activeModal, e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Tags Selection Modal */}
      {activeModal === 'topicsThatEnergize' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Topics that energize me</h3>
            <button className="save-btn" onClick={closeModal}>Save</button>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Select topics that matter to you:</p>
            <div className="tags-grid">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-select-btn ${profileData.topicsThatEnergize.includes(tag) ? 'selected' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guess Which One is True Modal */}
      {activeModal === 'guessWhichTrue' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Guess Which One is True</h3>
            <button className="save-btn" onClick={closeModal}>Save</button>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Add 3 statements. One should be true - tap the circle to mark it.</p>
            {[0, 1, 2].map(index => (
              <div key={index} className="guess-option-input">
                <button
                  className={`correct-toggle ${profileData.guessWhichTrue.correctIndex === index ? 'selected' : ''}`}
                  onClick={() => handleCorrectIndexChange(index)}
                >
                  {profileData.guessWhichTrue.correctIndex === index ? '✓' : ''}
                </button>
                <input
                  type="text"
                  placeholder={`Option ${index + 1}...`}
                  value={profileData.guessWhichTrue.options[index]}
                  onChange={(e) => handleGuessOptionChange(index, e.target.value)}
                  className="guess-input"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Selection Modal */}
      {activeModal === 'gameSelect' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Choose a Game</h3>
            <span className="save-btn" style={{ opacity: 0 }}>Save</span>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Select a game type for your profile:</p>
            <div className="game-type-list">
              {gameTypes.map(game => (
                <button
                  key={game.id}
                  className="game-type-card"
                  onClick={() => setActiveModal(game.id)}
                >
                  <span className="game-type-icon">{game.icon}</span>
                  <div className="game-type-info">
                    <span className="game-type-name">{game.name}</span>
                    <span className="game-type-desc">{game.description}</span>
                  </div>
                  <svg className="game-type-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Would You Rather Modal */}
      {activeModal === 'wouldYouRather' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={() => setActiveModal('gameSelect')}>Back</button>
            <h3>Would You Rather</h3>
            <button
              className="save-btn"
              onClick={closeModal}
              style={{ opacity: profileData.wouldYouRather.optionA && profileData.wouldYouRather.optionB ? 1 : 0.5 }}
            >
              Save
            </button>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Create a dilemma for others to vote on:</p>
            <div className="would-you-rather-inputs">
              <div className="wyr-card">
                <div className="wyr-card-header">
                  <span className="wyr-card-label">Option A</span>
                </div>
                <textarea
                  className="wyr-textarea"
                  placeholder="First option..."
                  value={profileData.wouldYouRather.optionA}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    wouldYouRather: { ...prev.wouldYouRather, optionA: e.target.value }
                  }))}
                />
              </div>
              <div className="wyr-vs">
                <span>or</span>
              </div>
              <div className="wyr-card">
                <div className="wyr-card-header">
                  <span className="wyr-card-label">Option B</span>
                </div>
                <textarea
                  className="wyr-textarea"
                  placeholder="Second option..."
                  value={profileData.wouldYouRather.optionB}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    wouldYouRather: { ...prev.wouldYouRather, optionB: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpopular Opinion Modal */}
      {activeModal === 'unpopularOpinion' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={() => setActiveModal('gameSelect')}>Back</button>
            <h3>Unpopular Opinion</h3>
            <button
              className="save-btn"
              onClick={closeModal}
              style={{ opacity: profileData.unpopularOpinion.opinion ? 1 : 0.5 }}
            >
              Save
            </button>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Share a hot take for others to react to:</p>
            <div className="hot-take-card">
              <p className="hot-take-label">My unpopular opinion</p>
              <textarea
                className="hot-take-textarea"
                placeholder="Type your unpopular opinion..."
                value={profileData.unpopularOpinion.opinion}
                onChange={(e) => setProfileData(prev => ({
                  ...prev,
                  unpopularOpinion: { ...prev.unpopularOpinion, opinion: e.target.value }
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditBio
