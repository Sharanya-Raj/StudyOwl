import PropTypes from 'prop-types'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ChatPanel from '../components/ChatPanel'

function StudySession({ doc, user, session, onLogout }) {
  const [availability, setAvailability] = useState('available')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'
  const sessionTitle = doc?.name ? `${doc.name} Study Session` : "Susan's Study Session"
  const chats = [
    { id: 'susan', name: "Susan's Study Session", preview: 'Next: review chapter 4', active: true },
    { id: 'jake', name: 'Jake Trivedi', preview: 'Quiz at 6 PM', active: false },
    { id: 'michelle', name: 'Michelle Ross', preview: 'Group notes uploaded', active: false },
    { id: 'naina', name: "Naina Raj's Study Session", preview: 'Looking for 2 more', active: false },
    { id: 'mia', name: 'Mia Shah', preview: 'Scheduling', active: false },
  ]

  const getInitials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')

  return (
    <main className="page-shell">
      <TopBar
        user={user}
        onLogout={onLogout}
        availability={availability}
        onToggleAvailability={() =>
          setAvailability((prev) => (prev === 'available' ? 'away' : 'available'))
        }
        notificationsCount={2}
      />
      <section className="page-header">
        <div>
          <p className="eyebrow">Study Session</p>
          <h1 className="page-title">Live study room</h1>
          <p className="page-subtitle">
            Join a session, catch up on notes, and keep your group on the same page.
          </p>
        </div>
        <div className="header-actions">
          <Link className="ghost-btn" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="session-layout">
        <aside className="session-sidebar">
          <div className="session-profile">
            <div className="session-avatar">{getInitials(user?.name || user?.email || 'SO')}</div>
            <div>
              <p className="session-name">{user?.name || user?.email || 'UserName'}</p>
              <Link className="session-link" to="/profile">
                Update profile
              </Link>
            </div>
          </div>

          <div className="session-section">
            <h3 className="session-section-title">Chats</h3>
            <div className="session-list">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  className={`session-item${chat.active ? ' is-active' : ''}`}
                  type="button"
                >
                  <span className="session-item-meta">
                    <span className="session-item-avatar">{getInitials(chat.name)}</span>
                    <span>
                      <span className="session-item-title">{chat.name}</span>
                      <span className="session-item-preview">{chat.preview}</span>
                    </span>
                  </span>
                  <span className="session-item-pill">Chat</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="session-chat">
          <header className="session-chat-header">
            <div className="session-title-group">
              <div className="session-avatar is-large">{getInitials(sessionTitle)}</div>
              <div>
                <h2 className="session-title">{sessionTitle}</h2>
                <p className="session-members">9 members online</p>
              </div>
            </div>
            <div className="session-actions">
              <button className="ghost-btn" type="button">
                Invite
              </button>
              <button className="primary-btn" type="button">
                Start focus
              </button>
            </div>
          </header>

          <ChatPanel
            documentId={doc?.documentId}
            session={session}
            apiBaseUrl={apiBaseUrl}
            title="Session chat"
            emptyMessage="Start the conversation with your study group."
            placeholder="Message the session..."
          />
        </section>
      </section>
    </main>
  )
}

StudySession.propTypes = {
  doc: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string,
    documentId: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  user: PropTypes.shape({
    email: PropTypes.string,
  }),
}

export default StudySession
