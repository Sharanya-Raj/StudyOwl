import PropTypes from 'prop-types'
import { useState } from 'react'
import TopBar from '../components/TopBar'
import ChatPanel from '../components/ChatPanel'
import PomodoroTimer from '../components/PomodoroTimer'

function LiveSession({ user, session, onLogout, documentId }) {
  const [availability, setAvailability] = useState('available')
  const [sharedNotes, setSharedNotes] = useState('')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'

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
          <p className="eyebrow">Live Study Session</p>
          <h1 className="page-title">Stay synced with your study circle.</h1>
          <p className="page-subtitle">
            Chat, capture shared notes, and keep time together.
          </p>
        </div>
      </section>
      <section className="live-grid">
        <ChatPanel
          documentId={documentId}
          session={session}
          apiBaseUrl={apiBaseUrl}
          title="Session chat"
          emptyMessage="Start the conversation or upload a document in AI Workspace first."
          placeholder="Message the session..."
        />
        <div className="live-side">
          <div className="panel-card notes-panel">
            <div className="panel-header">
              <h3>Shared notes</h3>
              <span className="panel-pill">Live</span>
            </div>
            <textarea
              className="notes-input"
              value={sharedNotes}
              onChange={(event) => setSharedNotes(event.target.value)}
              placeholder="Capture key takeaways and action items..."
            />
          </div>
          <PomodoroTimer />
        </div>
      </section>
    </main>
  )
}

LiveSession.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  documentId: PropTypes.string,
}

export default LiveSession
