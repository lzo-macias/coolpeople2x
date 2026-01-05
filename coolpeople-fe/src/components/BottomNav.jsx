import '../styling/BottomNav.css'

function BottomNav({ currentPage, onNavigate, theme = 'dark', notifications = {} }) {
  const iconBasePath = '/icons/bottomnavbar'
  const isLight = theme === 'light'

  // Regular icons always use darkmode (grey #777777) as base
  // Plus icon uses themed version (simple grey in dark, colorful gradient in light)
  const getIconPath = (iconName, isCreateIcon = false) => {
    if (isCreateIcon) {
      const t = isLight ? 'lightmode' : 'darkmode'
      return `${iconBasePath}/${t}/${iconName}-icon-${t}.svg`
    }
    // All other icons use darkmode grey version
    return `${iconBasePath}/darkmode/${iconName}-icon-darkmode.svg`
  }

  // Navigation items config
  const navItems = [
    { id: 'create', icon: 'plus', isCreate: true },
    { id: 'search', icon: 'explore' },
    { id: 'scoreboard', icon: 'scoreboard' },
    { id: 'home', icon: 'home' },
    { id: 'messages', icon: 'messages' },
    { id: 'profile', icon: 'userprofile' },
    { id: 'campaign', icon: 'mycampaign', hasNotification: true },
  ]

  return (
    <nav className={`bottom-nav ${isLight ? 'bottom-nav-light' : ''}`}>
      {navItems.map((item) => {
        const isActive = currentPage === item.id
        const notificationCount = notifications[item.id]

        // Plus icon always uses its themed version (no color filtering)
        const iconClass = item.isCreate
          ? 'nav-icon nav-icon-create'
          : `nav-icon ${isActive ? 'nav-icon-active' : ''}`

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''} ${item.isCreate ? 'create-btn' : ''}`}
            onClick={() => !item.isCreate && onNavigate?.(item.id)}
          >
            <div className="nav-icon-wrapper">
              <img
                src={getIconPath(item.icon, item.isCreate)}
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
