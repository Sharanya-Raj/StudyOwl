import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

function AuthLayout({ title, subtitle, children, footerLink }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <aside className="auth-hero">
          <div className="brand-badge">StudyOwl</div>
          <h1 className="hero-title">Stay organized, learn faster.</h1>
          <p className="hero-copy">
            Keep your study flow in one place. Build streaks, track progress, and
            stay motivated with a clean, simple dashboard.
          </p>
          <ul className="hero-points">
            <li>Personalized daily goals</li>
            <li>Focus-friendly task view</li>
            <li>Export notes and share updates</li>
          </ul>
          <div className="hero-footer">
            <span className="pill">Fast setup</span>
            <span className="pill">No distractions</span>
            <span className="pill">Secure by default</span>
          </div>
        </aside>

        <section className="auth-panel">
          <header className="auth-header">
            <p className="eyebrow">Access</p>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-subtitle">{subtitle}</p>
          </header>

          <div className="auth-content">{children}</div>

          <footer className="auth-footer">
            {footerLink?.label && footerLink?.to ? (
              <>
                <span>{footerLink.label}</span>
                <Link to={footerLink.to}>{footerLink.cta}</Link>
              </>
            ) : null}
          </footer>
        </section>
      </div>
    </div>
  )
}

AuthLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  footerLink: PropTypes.shape({
    label: PropTypes.string,
    cta: PropTypes.string,
    to: PropTypes.string,
  }),
}

export default AuthLayout
