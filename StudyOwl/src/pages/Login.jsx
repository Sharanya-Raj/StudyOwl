import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }

    setError('')
    setLoading(true)
    const result = onLogin({ email: email.trim(), password })
    setLoading(false)

    if (!result?.ok) {
      setError(result?.message || 'Unable to sign in. Please try again.')
      return
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your study streak and pick up where you left off."
      footerLink={{ label: "Don't have an account?", cta: 'Create one', to: '/signup' }}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="form-hint">
          <Link to="/signup">Need an account? Join StudyOwl</Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default Login
