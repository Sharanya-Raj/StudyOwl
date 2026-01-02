import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'

function Signup({ onSignup }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields to create your account.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords need to match.')
      return
    }

    setError('')
    setLoading(true)
    const result = onSignup({
      email: email.trim(),
      name: name.trim(),
      password,
    })
    setLoading(false)

    if (!result?.ok) {
      setError(result?.message || 'Could not create your account. Try again.')
      return
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up StudyOwl in seconds and keep your study goals moving."
      footerLink={{ label: 'Already have an account?', cta: 'Sign in', to: '/login' }}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <InputField
          label="Full name"
          value={name}
          onChange={setName}
          placeholder="Alex Kim"
          autoComplete="name"
        />
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
          placeholder="Create a strong password"
          autoComplete="new-password"
        />
        <InputField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div className="form-hint">
          <Link to="/login">Already registered? Go to sign in</Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default Signup
