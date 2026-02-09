import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'

function Profile({ user, onLogout }) {
  const storageKey = 'studyowl:courses'
  const [availability, setAvailability] = useState('available')
  const [preferences, setPreferences] = useState({
    focusReminders: true,
    weeklySummary: true,
    collaboration: false,
  })
  const [courses, setCourses] = useState([])
  const [newCourse, setNewCourse] = useState('')

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(courses))
  }, [courses])

  const togglePref = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAddCourse = () => {
    const value = newCourse.trim()
    if (!value) return
    if (courses.includes(value)) {
      setNewCourse('')
      return
    }
    setCourses((prev) => [...prev, value])
    setNewCourse('')
  }

  const handleRemoveCourse = (course) => {
    setCourses((prev) => prev.filter((item) => item !== course))
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
        notificationsCount={1}
      />
      <section className="page-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1 className="page-title">Your study profile</h1>
          <p className="page-subtitle">Manage preferences and track progress.</p>
        </div>
      </section>
      <section className="profile-grid">
        <div className="panel-card">
          <h3>User details</h3>
          <div className="profile-details">
            <div>
              <p className="profile-label">Name</p>
              <p>{user?.name || 'Student'}</p>
            </div>
            <div>
              <p className="profile-label">Email</p>
              <p>{user?.email || '—'}</p>
            </div>
            <div>
              <p className="profile-label">Active courses</p>
              <p>{courses.length || '—'}</p>
            </div>
          </div>
        </div>
        <div className="panel-card">
          <h3>Preferences</h3>
          <div className="toggle-list">
            <button className="toggle-row" type="button" onClick={() => togglePref('focusReminders')}>
              <span>Focus reminders</span>
              <span className={preferences.focusReminders ? 'toggle-dot is-on' : 'toggle-dot'} />
            </button>
            <button className="toggle-row" type="button" onClick={() => togglePref('weeklySummary')}>
              <span>Weekly summary</span>
              <span className={preferences.weeklySummary ? 'toggle-dot is-on' : 'toggle-dot'} />
            </button>
            <button className="toggle-row" type="button" onClick={() => togglePref('collaboration')}>
              <span>Collaboration invites</span>
              <span className={preferences.collaboration ? 'toggle-dot is-on' : 'toggle-dot'} />
            </button>
          </div>
        </div>
        <div className="panel-card">
          <h3>Study stats</h3>
          <div className="stats-grid">
            <div>
              <p className="stat-value">18</p>
              <p className="stat-label">Sessions this month</p>
            </div>
            <div>
              <p className="stat-value">6.2 hrs</p>
              <p className="stat-label">Focused time</p>
            </div>
            <div>
              <p className="stat-value">82%</p>
              <p className="stat-label">Goal completion</p>
            </div>
          </div>
        </div>
        <div className="panel-card">
          <h3>Current coursework</h3>
          <div className="course-form">
            <input
              className="field-input"
              type="text"
              value={newCourse}
              onChange={(event) => setNewCourse(event.target.value)}
              placeholder="Add a course (e.g., CS100 - Roadmap to Computing)"
            />
            <button className="primary-btn" type="button" onClick={handleAddCourse}>
              Add course
            </button>
          </div>
          <div className="course-list">
            {courses.length === 0 ? (
              <p className="panel-hint">Add your courses to personalize study buddy matches.</p>
            ) : (
              courses.map((course) => (
                <div key={course} className="course-chip">
                  <span>{course}</span>
                  <button type="button" onClick={() => handleRemoveCourse(course)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

Profile.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
}

export default Profile
