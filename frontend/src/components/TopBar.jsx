import PropTypes from 'prop-types'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function TopBar({ user, onLogout, availability, onToggleAvailability, notificationsCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link className="topbar-logo" to="/dashboard">
          StudyOwl
        </Link>
        <nav className="topbar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/workspace">AI Workspace</Link>
          <Link to="/study">Study Sessions</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </div>

      <div className="topbar-right">
        <button
          className={`availability-toggle ${availability === 'available' ? 'is-on' : ''}`}
          type="button"
          onClick={onToggleAvailability}
          aria-pressed={availability === 'available'}
        >
          {availability === 'available' ? 'Available' : 'Away'}
        </button>
        <button className="icon-button" type="button" aria-label="Notifications">
          <span className="icon-dot" aria-hidden="true" />
          {notificationsCount > 0 ? (
            <span className="badge">{notificationsCount}</span>
          ) : null}
        </button>
        <div className="profile-menu">
          <button
            className="profile-trigger"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="avatar" aria-hidden="true">
              {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
            </span>
            <span className="profile-name">
              {user?.name || user?.email || 'User'}
            </span>
          </button>
          {menuOpen ? (
            <div className="profile-dropdown">
              <Link to="/profile">View profile</Link>
              <button className="ghost-btn" type="button" onClick={onLogout}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

TopBar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  availability: PropTypes.oneOf(['available', 'away']).isRequired,
  onToggleAvailability: PropTypes.func.isRequired,
  notificationsCount: PropTypes.number,
}

export default TopBar
