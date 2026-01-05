import '../styling/NominationStories.css'
import { mockNominationStories, getPartyColor } from '../data/mockData'

function NominationStories() {
  return (
    <div className="stories-container">
      <div className="stories-scroll">
        {mockNominationStories.map((story) => {
          const partyColor = story.party ? getPartyColor(story.party) : null

          return (
            <div key={story.id} className="story-item">
              <div
                className={`story-ring ${story.isAdd ? 'add-story' : ''} ${story.hasNew ? 'has-new' : 'viewed'}`}
                style={partyColor ? { background: partyColor } : undefined}
              >
                {story.isAdd ? (
                  <div className="add-avatar">
                    <span className="plus-icon">+</span>
                  </div>
                ) : (
                  <img src={story.image} alt={story.name} className="story-avatar" />
                )}
              </div>
              {story.isAdd && <span className="story-label">cast your nominations</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default NominationStories
