import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

function AuthLayout({ title, subtitle, children, footerLink }) {
  return (
    <div className="auth-page">
      <div className="auth-card rustic-login">
        <section className="auth-panel">
          <div className="owl-icon" aria-label="Owl">
            <img src="https://cdn.pixabay.com/photo/2022/10/11/22/46/owl-7515291_1280.png" alt="Owl" style={{width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 2px 8px rgba(139,92,43,0.12)'}} />
          </div>
          <header className="auth-header">
            <h2 className="auth-title rustic-title">{title}</h2>
            <p className="auth-subtitle rustic-subtitle">{subtitle}</p>
          </header>
          {/* Only the form (children) is wrapped in auth-content, not the whole panel */}
          <div className="auth-content">
            {children}
          </div>
          <footer className="auth-footer">
            {footerLink?.label && footerLink?.to ? (
              <>
                <span>{footerLink.label}</span>
                <Link to={footerLink.to}>{footerLink.cta}</Link>
              </>
            ) : null}
          </footer>
        </section>
        <aside className="auth-side-panel">
          <div className="side-title">Study Owl</div>
          <div className="side-subtitle">Find studious owls as motivated as you!</div>
          <img className="side-owl-img" src="https://images.vexels.com/media/users/3/229175/isolated/preview/9acf43fe149889a0afd3dcbb1598057b-flying-barn-owl-hand-drawn.png" alt="Flying Owl" />
        </aside>
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
