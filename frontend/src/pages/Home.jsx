import PropTypes from 'prop-types'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import UploadPanel from '../components/UploadPanel'

function Home({ user, session, onLogout, onUploadDoc, onSetDocumentId }) {
  const [availability, setAvailability] = useState('available')
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
        notificationsCount={4}
      />
      <section className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">
            Welcome back{user?.name || user?.email ? `, ${user?.name || user?.email}` : ''}
          </h1>
          <p className="page-subtitle">
            Organize courses, open an AI workspace, and keep sessions flowing.
          </p>
        </div>
        <div className="header-actions">
          <Link className="ghost-btn" to="/study">
            Open study session
          </Link>
          <Link className="primary-btn" to="/workspace">
            Open AI workspace
          </Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel-card">
          <h3>Courses</h3>
          <ul className="panel-list">
            <li>Microeconomics - Unit 5</li>
            <li>Linear Algebra - Quiz prep</li>
            <li>Neuroscience - Reading list</li>
          </ul>
          <p className="panel-hint">Coming soon: organize courses and syllabi.</p>
        </div>

        <UploadPanel
          user={user}
          session={session}
          onUploadDoc={onUploadDoc}
          onSetDocumentId={onSetDocumentId}
          apiBaseUrl={apiBaseUrl}
          title="Study Tools"
          description="Upload notes and jump into the AI workspace."
        />

        <div className="panel-card">
          <h3>Study Sessions</h3>
          <p>Coordinate with your group and keep the session chat flowing.</p>
          <Link className="primary-btn" to="/study">
            Open study session
          </Link>
        </div>

        <div className="panel-card">
          <h3>Upcoming Tasks</h3>
          <ul className="panel-list">
            <li>Problem set due Friday</li>
            <li>Read chapter 7 notes</li>
            <li>Flashcards review</li>
          </ul>
          <p className="panel-hint">Coming soon: task planning and reminders.</p>
        </div>
      </section>
    </main>
  )
}

Home.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
  }),
  session: PropTypes.shape({
    access_token: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
  onUploadDoc: PropTypes.func.isRequired,
  onSetDocumentId: PropTypes.func.isRequired,
}

export default Home
