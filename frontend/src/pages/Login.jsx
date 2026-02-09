import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import { supabase } from '../auth/supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }

    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message || 'Unable to sign in. Please try again.')
    }

    setLoading(false)
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
      </form>
    </AuthLayout>
  )
}

export default Login
