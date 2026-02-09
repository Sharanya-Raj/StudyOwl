import { Link } from 'react-router-dom'

function Landing() {
  return (
    <main className="landing-page">
      <header className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">StudyOwl</p>
          <h1 className="landing-title">Build a focused learning ritual.</h1>
          <p className="landing-subtitle">
            StudyOwl keeps your courses, AI insights, and live sessions in one calm,
            motivating workspace. Upload notes, ask questions, and stay on track.
          </p>
          <div className="landing-actions">
            <Link className="primary-btn" to="/signup">
              Create account
            </Link>
            <Link className="ghost-btn" to="/login">
              Sign in
            </Link>
          </div>
        </div>
        <div className="landing-glass">
          <div className="landing-card">
            <h3>Today in focus</h3>
            <ul>
              <li>Finish microeconomics notes</li>
              <li>Join 7:00pm live session</li>
              <li>Review flashcards set A</li>
            </ul>
            <div className="landing-highlight">AI workspace ready</div>
          </div>
        </div>
      </header>
      <section className="landing-grid">
        <article className="landing-feature">
          <h3>Courses</h3>
          <p>Organize coursework into clear tracks and keep progress visible.</p>
        </article>
        <article className="landing-feature">
          <h3>AI Workspace</h3>
          <p>Upload PDFs, pull out summaries, and quiz yourself in seconds.</p>
        </article>
        <article className="landing-feature">
          <h3>Live Sessions</h3>
          <p>Collaborate with focus timers, notes, and shared chat.</p>
        </article>
      </section>
    </main>
  )
}

export default Landing
