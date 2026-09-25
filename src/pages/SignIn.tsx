import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg-app pt-[calc(env(safe-area-inset-top)+64px)]">
      <Logo className="h-[26px] w-auto text-text-primary" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col px-4 py-8">
        <div className="ios-group !mx-0">
          <label className="ios-row-field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label className="ios-row-field">
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Required"
            />
          </label>
        </div>

        <Link to="/forgot-password" className="self-end pt-3 px-1 text-[15px] text-accent">
          Forgot password?
        </Link>

        {error && <p className="mt-3 px-1 text-[15px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-6">
          <button type="submit" disabled={submitting} className="ios-btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="py-6 text-center text-[17px] text-text-primary">
          First time with us?{' '}
          <Link to="/sign-up" className="font-semibold text-accent">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
