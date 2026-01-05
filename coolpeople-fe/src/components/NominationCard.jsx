import '../styling/NominationCard.css'

function NominationCard() {
  return (
    <div className="nomination-card-container">
      <div className="nomination-card">
        <button className="add-nomination-btn">
          <span className="btn-icon">+</span>
        </button>
      </div>
      <h2 className="nomination-title">Cast Your Nominations</h2>
    </div>
  )
}

export default NominationCard
