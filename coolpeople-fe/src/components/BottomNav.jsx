import '../styling/BottomNav.css'

function BottomNav({ currentPage, onNavigate, theme = 'dark', notifications = {} }) {
  const iconBasePath = '/icons/bottomnavbar'
  const isLight = theme === 'light'

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
    { id: 'search', icon: 'explore' },
    { id: 'scoreboard', icon: 'scoreboard' },
    { id: 'home', icon: 'home' },
    { id: 'messages', icon: 'messages' },
    { id: 'profile', icon: 'userprofile' },
    { id: 'campaign', icon: 'bouncingballs', isThemed: true, hasNotification: true },
  ]

  return (
    <nav className={`bottom-nav ${isLight ? 'bottom-nav-light' : ''}`}>
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

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''} ${isCreateBtn ? 'create-btn' : ''}`}
            onClick={() => !isCreateBtn && onNavigate?.(item.id)}
          >
            <div className="nav-icon-wrapper">
              <img
                src={getIconPath(item.icon, item.isThemed)}
                alt={item.id}
                className={iconClass}
              />
              {item.hasNotification && notificationCount > 0 && (
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
