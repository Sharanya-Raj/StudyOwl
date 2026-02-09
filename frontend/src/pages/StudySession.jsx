import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ChatPanel from '../components/ChatPanel'

function StudySession({ doc, user, session, onLogout }) {
  const storageKey = 'studyowl:courses'
  const [availability, setAvailability] = useState('available')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'
  const sessionTitle = 'Study Session'
  const currentSessions = [
    { id: 'susan', name: "Susan's Study Session", preview: 'Next: review chapter 4', active: true },
    { id: 'jake', name: 'Jake Trivedi', preview: 'Quiz at 6 PM', active: false },
    { id: 'michelle', name: 'Michelle Ross', preview: 'Group notes uploaded', active: false },
    { id: 'naina', name: "Naina Raj's Study Session", preview: 'Looking for 2 more', active: false },
    { id: 'mia', name: 'Mia Shah', preview: 'Scheduling', active: false },
  ]
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [timeFilter, setTimeFilter] = useState('today')
  const [selectedDate, setSelectedDate] = useState('')
  const [showBuddies, setShowBuddies] = useState(true)
  const [matches, setMatches] = useState([])
  const [matchError, setMatchError] = useState('')
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [selectedBuddy, setSelectedBuddy] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [sessionAccepted, setSessionAccepted] = useState(false)

  const getInitials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')

  const loadCourses = () => {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setCourses(parsed)
      }
    } catch (error) {
      console.warn('Failed to parse stored courses:', error)
    }
  }

  useEffect(() => {
    loadCourses()
    const handleStorage = (event) => {
      if (event.key === storageKey) {
        loadCourses()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const fetchMatches = async () => {
    setMatchError('')
    setMatchesLoading(true)

    try {
      const token = session?.access_token
      if (!token) {
        setMatchError('Sign in to view study buddy matches.')
        setMatchesLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (selectedCourse) params.set('course', selectedCourse)
      if (user?.id) params.set('user_id', user.id)
      params.set('limit', '25')

      const response = await fetch(`${apiBaseUrl}/sessions/available?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch matches.')
      }

      setMatches(data.matches || [])
      setSelectedBuddy(null)
      setRequestSent(false)
      setSessionAccepted(false)
    } catch (error) {
      console.error('Match fetch failed:', error)
      setMatchError(error.message || 'Unable to load matches.')
    } finally {
      setMatchesLoading(false)
    }
  }

  const handleSelectBuddy = (buddy) => {
    setSelectedBuddy(buddy)
    setRequestSent(false)
    setSessionAccepted(false)
  }

  const handleSendRequest = () => {
    if (!selectedBuddy) return
    setRequestSent(true)
  }

  const handleAcceptSession = () => {
    if (!selectedBuddy) return
    setSessionAccepted(true)
  }

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
            <h3 className="session-section-title">Find Study Buddies</h3>
            <div className="session-filters">
              <label className="filter-group">
                <span className="filter-label">Class</span>
                <select
                  className="field-input"
                  value={selectedCourse}
                  onChange={(event) => setSelectedCourse(event.target.value)}
                >
                  <option value="">All courses</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-group">
                <span className="filter-label">Time</span>
                <select
                  className="field-input"
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="future">Future (calendar)</option>
                </select>
              </label>
              {timeFilter === 'future' ? (
                <label className="filter-group">
                  <span className="filter-label">Select date</span>
                  <input
                    className="field-input"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={showBuddies}
                  onChange={(event) => setShowBuddies(event.target.checked)}
                />
                <span>Show study buddies only</span>
              </label>
              <button className="primary-btn" type="button" onClick={fetchMatches}>
                {matchesLoading ? 'Finding...' : 'Find other owls'}
              </button>
              {matchError ? <p className="form-error">{matchError}</p> : null}
            </div>
          </div>

          <div className="session-section">
            <h3 className="session-section-title">
              {showBuddies ? 'Study buddies' : 'Current sessions'}
            </h3>
            <div className="session-list">
              {showBuddies ? (
                matches.length ? (
                  matches.map((match) => (
                    <button
                      key={match.user_id}
                      className={`session-item${selectedBuddy?.user_id === match.user_id ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => handleSelectBuddy(match)}
                    >
                      <span className="session-item-meta">
                        <span className="session-item-avatar">
                          {getInitials(match.name || 'Study Buddy')}
                        </span>
                        <span>
                          <span className="session-item-title">{match.name || 'Study Buddy'}</span>
                          <span className="session-item-preview">
                            {match.courses?.length ? match.courses.join(', ') : 'Available now'}
                          </span>
                        </span>
                      </span>
                      <span className="session-item-pill">Match</span>
                    </button>
                  ))
                ) : (
                  <p className="session-empty">No study buddies yet. Try a different class.</p>
                )
              ) : (
                currentSessions.map((chat) => (
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
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="session-chat">
          <header className="session-chat-header">
            <div className="session-title-group">
              <div className="session-avatar is-large">{getInitials(sessionTitle)}</div>
              <div>
                <h2 className="session-title">{sessionTitle}</h2>
                <p className="session-members">
                  {sessionAccepted && selectedBuddy
                    ? `Matched with ${selectedBuddy.name || 'Study Buddy'}`
                    : 'Select a buddy or session to continue'}
                </p>
              </div>
            </div>
            <div className="session-actions">
              {selectedBuddy ? (
                sessionAccepted ? (
                  <button className="primary-btn" type="button">
                    Start focus
                  </button>
                ) : (
                  <>
                    <button className="ghost-btn" type="button" onClick={handleSendRequest}>
                      {requestSent ? 'Request sent' : 'Send request'}
                    </button>
                    <button className="primary-btn" type="button" onClick={handleAcceptSession}>
                      Simulate accept
                    </button>
                  </>
                )
              ) : (
                <button className="ghost-btn" type="button" disabled>
                  Select a buddy
                </button>
              )}
            </div>
          </header>
          {sessionAccepted ? (
            <ChatPanel
              documentId={null}
              session={session}
              apiBaseUrl={apiBaseUrl}
              title="Session chat"
              emptyMessage="Start the conversation with your study group."
              placeholder="Message the session..."
            />
          ) : (
            <div className="panel-card session-locked">
              <h3>Chat locked</h3>
              <p>
                Choose a study buddy or session and get accepted before the chat unlocks.
              </p>
            </div>
          )}
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
