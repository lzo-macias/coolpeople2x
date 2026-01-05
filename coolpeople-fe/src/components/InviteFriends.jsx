import '../styling/InviteFriends.css'
import { mockContacts } from '../data/mockData'

function InviteFriends() {
  return (
    <div className="invite-container">
      <p className="invite-title">Invite your friends</p>
      <div className="contacts-scroll">
        {mockContacts.map((contact) => (
          <div key={contact.id} className="contact-item">
            <div className="contact-avatar">
              {contact.image ? (
                <img src={contact.image} alt="contact" />
              ) : contact.initial ? (
                <span className="contact-initial">{contact.initial}</span>
              ) : (
                <span className="contact-initial">?</span>
              )}
            </div>
            {contact.phone && <span className="contact-phone">{contact.phone}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InviteFriends
