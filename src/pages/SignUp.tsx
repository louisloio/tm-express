import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export function SignUp() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signUp(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-bg-app pt-[calc(env(safe-area-inset-top)+64px)]">
        <Logo className="h-[26px] w-auto text-text-primary" />
        <div className="mt-12 w-full max-w-[420px] px-4 py-6 text-center">
          <p className="text-[17px] text-text-primary">
            Check <strong>{email}</strong> to confirm your account, then sign in.
          </p>
          <Link to="/sign-in" className="ios-btn-primary mt-8 block w-full">
            Go to sign in
          </Link>
        </div>
      </div>
    )
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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ characters"
            />
          </label>
        </div>

        {error && <p className="mt-3 px-1 text-[15px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-6">
          <button type="submit" disabled={submitting} className="ios-btn-primary w-full">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </div>

        <p className="py-6 text-center text-[17px] text-text-primary">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-semibold text-accent">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
