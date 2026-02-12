import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import { supabase } from '../auth/supabaseClient'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    console.log('Signup form submitted');
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

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message || 'Could not create your account. Try again.')
      setLoading(false)
      return
    }

    // If signup is successful, redirect to login and show a message
    setLoading(false)
    alert('Account created! Please check your email to confirm your account, then log in.')
    navigate('/login')
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
      </form>
    </AuthLayout>
  )
}

export default Signup
