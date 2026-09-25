import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useAuth } from '../context/AuthContext'

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await sendPasswordReset(email)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-bg-app pt-[calc(env(safe-area-inset-top)+64px)]">
        <img src={logo} alt="TM Express" className="h-[22px] w-auto" />
        <div className="mt-12 w-full max-w-[420px] px-4 py-6 text-center">
          <p className="text-[17px] text-text-primary">
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your
            password.
          </p>
          <Link to="/sign-in" className="ios-btn-primary mt-8 block w-full">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg-app pt-[calc(env(safe-area-inset-top)+64px)]">
      <img src={logo} alt="TM Express" className="h-[22px] w-auto" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col px-4 py-8">
        <p className="pb-6 text-[15px] text-text-secondary">
          Enter your email and we'll send you a link to reset your password.
        </p>

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
        </div>

        {error && <p className="mt-3 px-1 text-[15px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-6">
          <button type="submit" disabled={submitting} className="ios-btn-primary w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </div>

        <p className="py-6 text-center text-[17px] text-text-primary">
          <Link to="/sign-in" className="font-semibold text-accent">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
