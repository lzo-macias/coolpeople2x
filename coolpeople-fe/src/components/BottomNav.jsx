import '../styling/BottomNav.css'

function BottomNav({ currentPage, onNavigate, onCreateClick, theme = 'dark', notifications = {} }) {
  const iconBasePath = '/icons/bottomnavbar'
  const isLight = theme === 'light'
  const isBallot = theme === 'ballot'

  // Regular icons always use darkmode (grey #777777) as base
  // Plus icon uses themed versions, bouncingballs only themed in dark mode
  const getIconPath = (iconName, isThemed = false) => {
    if (isThemed) {
      const t = isLight ? 'lightmode' : 'darkmode'
      // Bouncingballs: themed in dark mode only, gray version in light mode
      if (iconName === 'bouncingballs') {
        return isLight
          ? `${iconBasePath}/darkmode/bouncingballs-darkmode.svg`  // gray for light mode
          : `${iconBasePath}/darkmode/bouncingballs-darkmode.svg`  // themed for dark mode
      }
      return `${iconBasePath}/${t}/${iconName}-icon-${t}.svg`
    }
    // All other icons use darkmode grey version
    return `${iconBasePath}/darkmode/${iconName}-icon-darkmode.svg`
  }

  // Navigation items config
  const navItems = [
    { id: 'create', icon: 'plus', isThemed: true },
    { id: 'scoreboard', icon: 'scoreboard' },
    { id: 'home', icon: 'home' },
    { id: 'messages', icon: 'messages' },
    { id: 'campaign', icon: 'bouncingballs', isThemed: true },
  ]

  return (
    <nav className={`bottom-nav ${isLight ? 'bottom-nav-light' : ''} ${isBallot ? 'bottom-nav-ballot' : ''}`}>
      {navItems.map((item) => {
        const isActive = currentPage === item.id
        const notificationCount = notifications[item.id]

        // Themed icons handling
        const isCreateBtn = item.id === 'create'
        const isCampaignBtn = item.id === 'campaign'

        let iconClass = 'nav-icon'
        if (isCreateBtn) {
          iconClass = 'nav-icon nav-icon-create'
        } else if (isCampaignBtn) {
          // Campaign: themed (no filter) in dark mode, regular active filter in light mode
          iconClass = isLight
            ? `nav-icon ${isActive ? 'nav-icon-active' : ''}`
            : 'nav-icon nav-icon-themed'
        } else {
          iconClass = `nav-icon ${isActive ? 'nav-icon-active' : ''}`
        }

        // Custom messages icon with built-in notification circle for ballot theme
        const isMessagesWithBallot = item.id === 'messages' && isBallot && notificationCount > 0

        // Animated bouncing balls when NOT on campaign page AND has notification
        const isCampaignAnimated = item.id === 'campaign' && !isActive && !isBallot && notificationCount > 0

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''} ${isCreateBtn ? 'create-btn' : ''}`}
            onClick={() => isCreateBtn ? onCreateClick?.() : onNavigate?.(item.id)}
          >
            <div className="nav-icon-wrapper">
              {isMessagesWithBallot ? (
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="nav-icon nav-icon-messages-ballot">
                  <path d="M28 15.3334C28.0046 17.0932 27.5934 18.8292 26.8 20.4C25.8592 22.2824 24.413 23.8656 22.6233 24.9724C20.8335 26.0792 18.771 26.6659 16.6667 26.6667C14.9068 26.6713 13.1708 26.2601 11.6 25.4667L4 28L6.53333 20.4C5.73991 18.8292 5.32875 17.0932 5.33333 15.3334C5.33415 13.229 5.92082 11.1665 7.02763 9.37677C8.13444 7.58704 9.71767 6.14079 11.6 5.20004C13.1708 4.40661 14.9068 3.99545 16.6667 4.00004H17.3333C20.1125 4.15336 22.7374 5.32639 24.7055 7.29452C26.6737 9.26265 27.8467 11.8876 28 14.6667V15.3334Z" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="25" cy="25" r="7" fill="#1A1A2E"/>
                  <text x="25" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="500">{notificationCount}</text>
                </svg>
              ) : isCampaignAnimated ? (
                <div className="campaign-balls-container">
                  <div className="ball-wrapper ball-big">
                    <div className="ball-inner"></div>
                  </div>
                  <div className="ball-wrapper ball-small-1">
                    <div className="ball-inner"></div>
                  </div>
                  <div className="ball-wrapper ball-small-2">
                    <div className="ball-inner"></div>
                  </div>
                </div>
              ) : (
                <img
                  src={getIconPath(item.icon, item.isThemed)}
                  alt={item.id}
                  className={iconClass}
                />
              )}
              {item.hasNotification && notificationCount > 0 && !isMessagesWithBallot && (
                <>
                  <img
                    src={`${iconBasePath}/redflag-icon.svg`}
                    alt="notification"
                    className="notification-flag"
                  />
                  <span className="notification-badge">{notificationCount}</span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
