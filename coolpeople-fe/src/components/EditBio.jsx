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

// Slider types for political views
const sliderTypes = [
  {
    id: 'viewsOnTransRights',
    name: 'My views on trans rights',
    description: 'Share where you stand on trans rights',
    icon: '🏳️‍⚧️',
  },
  {
    id: 'viewsOnIce',
    name: 'My views on ICE',
    description: 'Share your stance on immigration enforcement',
    icon: '🛂',
  },
  {
    id: 'viewsOnHealthcare',
    name: 'My views on healthcare',
    description: 'Share where you stand on healthcare policy',
    icon: '🏥',
  },
  {
    id: 'viewsOnGunControl',
    name: 'My views on gun control',
    description: 'Share your stance on gun regulations',
    icon: '🔫',
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
  const getInitialData = (data) => ({
    viewsOnIce: data?.viewsOnIce?.score ?? null,
    viewsOnTransRights: data?.viewsOnTransRights?.score ?? null,
    viewsOnHealthcare: data?.viewsOnHealthcare?.score ?? null,
    viewsOnGunControl: data?.viewsOnGunControl?.score ?? null,
    hillToDieOn: data?.hillToDieOn?.content ?? '',
    topicsThatEnergize: data?.topicsThatEnergize?.tags ?? [],
    accomplishment: data?.accomplishment?.content ?? '',
    guessWhichTrue: {
      options: data?.guessWhichTrue?.options ?? ['', '', ''],
      correctIndex: data?.guessWhichTrue?.correctIndex ?? null,
    },
    wouldYouRather: {
      optionA: '',
      optionB: '',
    },
    unpopularOpinion: {
      opinion: '',
    },
    // Custom icebreakers
    customWritten: data?.customWritten ?? [],
    customSliders: data?.customSliders ?? [],
  })

  // Track which slider is being edited
  const [editingSlider, setEditingSlider] = useState(null)

  // Track which custom item is being edited (index) or null for new
  const [editingCustomWrittenIndex, setEditingCustomWrittenIndex] = useState(null)
  const [editingCustomSliderIndex, setEditingCustomSliderIndex] = useState(null)

  // Temp state for new custom icebreakers
  const [newWrittenPrompt, setNewWrittenPrompt] = useState('')
  const [newWrittenResponse, setNewWrittenResponse] = useState('')
  const [newSliderPrompt, setNewSliderPrompt] = useState('')
  const [newSliderValue, setNewSliderValue] = useState(5)

  // Profile sections state - matches CandidateProfile profileSections
  const [profileData, setProfileData] = useState(() => getInitialData(passedProfileData))

  // Sync state when passedProfileData changes (e.g., when modal reopens)
  useEffect(() => {
    setProfileData(getInitialData(passedProfileData))
  }, [passedProfileData])

  // Modal state
  const [activeModal, setActiveModal] = useState(null)

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
    // Reset temp state
    setNewWrittenPrompt('')
    setNewWrittenResponse('')
    setNewSliderPrompt('')
    setNewSliderValue(5)
    setEditingCustomWrittenIndex(null)
    setEditingCustomSliderIndex(null)
  }

  // Handle saving custom written icebreaker
  const handleSaveCustomWritten = () => {
    if (!newWrittenPrompt.trim() || !newWrittenResponse.trim()) return

    setProfileData(prev => {
      const newCustomWritten = [...prev.customWritten]
      if (editingCustomWrittenIndex !== null) {
        newCustomWritten[editingCustomWrittenIndex] = { prompt: newWrittenPrompt, response: newWrittenResponse }
      } else {
        newCustomWritten.push({ prompt: newWrittenPrompt, response: newWrittenResponse })
      }
      return { ...prev, customWritten: newCustomWritten }
    })
    closeModal()
  }

  // Handle saving custom slider icebreaker
  const handleSaveCustomSlider = () => {
    if (!newSliderPrompt.trim()) return

    setProfileData(prev => {
      const newCustomSliders = [...prev.customSliders]
      if (editingCustomSliderIndex !== null) {
        newCustomSliders[editingCustomSliderIndex] = { prompt: newSliderPrompt, value: newSliderValue }
      } else {
        newCustomSliders.push({ prompt: newSliderPrompt, value: newSliderValue })
      }
      return { ...prev, customSliders: newCustomSliders }
    })
    closeModal()
  }

  // Handle removing an icebreaker
  const handleRemove = (field, e) => {
    e.stopPropagation()
    if (field === 'topicsThatEnergize') {
      setProfileData(prev => ({ ...prev, [field]: [] }))
    } else if (field === 'guessWhichTrue') {
      setProfileData(prev => ({
        ...prev,
        guessWhichTrue: { options: ['', '', ''], correctIndex: null }
      }))
    } else if (field === 'wouldYouRather') {
      setProfileData(prev => ({
        ...prev,
        wouldYouRather: { optionA: '', optionB: '' }
      }))
    } else if (field === 'unpopularOpinion') {
      setProfileData(prev => ({
        ...prev,
        unpopularOpinion: { opinion: '' }
      }))
    } else {
      setProfileData(prev => ({ ...prev, [field]: field.startsWith('viewsOn') ? null : '' }))
    }
  }

  // Handle removing custom written icebreaker
  const handleRemoveCustomWritten = (index, e) => {
    e.stopPropagation()
    setProfileData(prev => ({
      ...prev,
      customWritten: prev.customWritten.filter((_, i) => i !== index)
    }))
  }

  // Handle removing custom slider icebreaker
  const handleRemoveCustomSlider = (index, e) => {
    e.stopPropagation()
    setProfileData(prev => ({
      ...prev,
      customSliders: prev.customSliders.filter((_, i) => i !== index)
    }))
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

  // Get filled sliders
  const getFilledSliders = () => {
    return sliderTypes.filter(slider => profileData[slider.id] !== null)
  }

  return (
    <div className="edit-bio">
      {/* Icebreakers Section */}
      <div className="icebreakers-section">
        <h3 className="icebreakers-title">ICEBREAKERS</h3>

        {/* Written Category */}
        <div className="icebreaker-category">
          <span className="category-label">written</span>

          {/* Custom Written Icebreakers */}
          {profileData.customWritten.map((item, index) => (
            <div
              key={`custom-written-${index}`}
              className="icebreaker-card filled"
              onClick={() => {
                setEditingCustomWrittenIndex(index)
                setNewWrittenPrompt(item.prompt)
                setNewWrittenResponse(item.response)
                openModal('customWritten')
              }}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">{item.prompt}</p>
                <p className="icebreaker-response">{item.response}</p>
              </div>
              <div className="icebreaker-actions">
                <button className="remove-btn" onClick={(e) => handleRemoveCustomWritten(index, e)}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13H5v-2h14v2z"/>
                  </svg>
                </button>
                <button className="edit-btn" onClick={(e) => {
                  e.stopPropagation()
                  setEditingCustomWrittenIndex(index)
                  setNewWrittenPrompt(item.prompt)
                  setNewWrittenResponse(item.response)
                  openModal('customWritten')
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Empty card to add new written icebreaker */}
          <div
            className="icebreaker-card empty"
            onClick={() => openModal('customWritten')}
          >
            <button className="add-btn centered">
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
              <div className="icebreaker-actions">
                <button className="remove-btn" onClick={(e) => handleRemove('topicsThatEnergize', e)}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13H5v-2h14v2z"/>
                  </svg>
                </button>
                <button className="edit-btn" onClick={(e) => { e.stopPropagation(); openModal('topicsThatEnergize'); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Empty card to add tags */}
          <div
            className="icebreaker-card empty"
            onClick={() => openModal('topicsThatEnergize')}
          >
            <button className="add-btn centered">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Game Category */}
        <div className="icebreaker-category">
          <span className="category-label">game</span>

          {/* Guess Which One is True */}
          {profileData.guessWhichTrue.options.some(o => o) && (
            <div
              className="icebreaker-card filled"
              onClick={() => openModal('guessWhichTrue')}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">Guess Which One is True</p>
                <p className="icebreaker-response">{profileData.guessWhichTrue.options.filter(o => o).length} options added</p>
              </div>
              <div className="icebreaker-actions">
                <button className="remove-btn" onClick={(e) => handleRemove('guessWhichTrue', e)}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13H5v-2h14v2z"/>
                  </svg>
                </button>
                <button className="edit-btn" onClick={(e) => { e.stopPropagation(); openModal('guessWhichTrue'); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Empty card to add new game */}
          <div
            className="icebreaker-card empty"
            onClick={() => openModal('gameSelect')}
          >
            <button className="add-btn centered">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Slider Category */}
        <div className="icebreaker-category">
          <span className="category-label">slider</span>

          {/* Custom Sliders */}
          {profileData.customSliders.map((item, index) => (
            <div
              key={`custom-slider-${index}`}
              className="icebreaker-card filled"
              onClick={() => {
                setEditingCustomSliderIndex(index)
                setNewSliderPrompt(item.prompt)
                setNewSliderValue(item.value)
                openModal('customSlider')
              }}
            >
              <div className="icebreaker-content">
                <p className="icebreaker-prompt">{item.prompt}</p>
                <p className="icebreaker-response">{item.value}/10</p>
              </div>
              <div className="icebreaker-actions">
                <button className="remove-btn" onClick={(e) => handleRemoveCustomSlider(index, e)}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13H5v-2h14v2z"/>
                  </svg>
                </button>
                <button className="edit-btn" onClick={(e) => {
                  e.stopPropagation()
                  setEditingCustomSliderIndex(index)
                  setNewSliderPrompt(item.prompt)
                  setNewSliderValue(item.value)
                  openModal('customSlider')
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Empty card to add new slider */}
          <div className="icebreaker-card empty" onClick={() => openModal('customSlider')}>
            <button className="add-btn centered">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="bio-bottom-action">
        {canSend ? (
          <button className="icebreakers-save-btn" onClick={() => onSave?.(profileData)}>Save</button>
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

      {/* Slider Selection Modal */}
      {activeModal === 'sliderSelect' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Choose a Slider</h3>
            <span className="save-btn" style={{ opacity: 0 }}>Save</span>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Select a topic to share your stance:</p>
            <div className="game-type-list">
              {sliderTypes.filter(slider => profileData[slider.id] === null).map(slider => (
                <button
                  key={slider.id}
                  className="game-type-card"
                  onClick={() => {
                    setEditingSlider(slider.id)
                    setActiveModal('sliderEdit')
                  }}
                >
                  <span className="game-type-icon">{slider.icon}</span>
                  <div className="game-type-info">
                    <span className="game-type-name">{slider.name}</span>
                    <span className="game-type-desc">{slider.description}</span>
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

      {/* Slider Edit Modal */}
      {activeModal === 'sliderEdit' && editingSlider && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={() => {
              setEditingSlider(null)
              setActiveModal('sliderSelect')
            }}>Back</button>
            <h3>{sliderTypes.find(s => s.id === editingSlider)?.name || 'Set Value'}</h3>
            <button
              className="save-btn"
              onClick={() => {
                setEditingSlider(null)
                closeModal()
              }}
            >
              Save
            </button>
          </div>
          <div className="write-modal-content">
            <p className="modal-instruction">Drag the slider to set your position:</p>
            <div className="slider-edit-container">
              <div className="slider-edit-bar">
                <div
                  className="slider-edit-indicator"
                  style={{
                    left: `${(profileData[editingSlider] ?? 5) * 10}%`,
                    background: getScoreColor(profileData[editingSlider] ?? 5)
                  }}
                >
                  <span className="slider-edit-value">{profileData[editingSlider] ?? 5}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={profileData[editingSlider] ?? 5}
                onChange={(e) => handleSliderChange(editingSlider, e.target.value)}
                className="slider-edit-input"
              />
              <div className="slider-edit-labels">
                <span>0</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Written Modal */}
      {activeModal === 'customWritten' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Written</h3>
            <button
              className="save-btn"
              onClick={handleSaveCustomWritten}
              style={{ opacity: newWrittenPrompt.trim() && newWrittenResponse.trim() ? 1 : 0.5 }}
            >
              Save
            </button>
          </div>
          <div className="write-modal-content">
            <input
              type="text"
              className="custom-prompt-input"
              placeholder="Fill in icebreaker"
              value={newWrittenPrompt}
              onChange={(e) => setNewWrittenPrompt(e.target.value)}
            />
            <textarea
              className="custom-response-textarea"
              placeholder="Fill in response"
              value={newWrittenResponse}
              onChange={(e) => setNewWrittenResponse(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Custom Slider Modal */}
      {activeModal === 'customSlider' && (
        <div className="write-modal">
          <div className="write-modal-header">
            <button className="back-btn" onClick={closeModal}>Back</button>
            <h3>Slider</h3>
            <button
              className="save-btn"
              onClick={handleSaveCustomSlider}
              style={{ opacity: newSliderPrompt.trim() ? 1 : 0.5 }}
            >
              Save
            </button>
          </div>
          <div className="write-modal-content">
            <input
              type="text"
              className="custom-prompt-input"
              placeholder="Fill in prompt"
              value={newSliderPrompt}
              onChange={(e) => setNewSliderPrompt(e.target.value)}
            />
            <div className="slider-edit-container">
              <div className="slider-edit-bar">
                <div
                  className="slider-edit-indicator"
                  style={{
                    left: `${newSliderValue * 10}%`,
                    background: getScoreColor(newSliderValue)
                  }}
                >
                  <span className="slider-edit-value">{newSliderValue}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={newSliderValue}
                onChange={(e) => setNewSliderValue(parseInt(e.target.value))}
                className="slider-edit-input"
              />
              <div className="slider-edit-labels">
                <span>0</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditBio
