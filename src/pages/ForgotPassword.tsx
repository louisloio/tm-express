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
      <div className="flex min-h-screen flex-col items-center bg-bg-app pt-16">
        <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
        <div className="mt-12 w-full max-w-[354px] p-6 text-center">
          <p className="text-[16px] text-text-primary">
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your
            password.
          </p>
          <Link
            to="/sign-in"
            className="btn-primary mt-8 inline-block w-full rounded-lg px-12 py-[15px] text-[16px] font-medium text-white"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg-app pt-16">
      <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[354px] flex-col p-6">
        <p className="pb-6 text-[16px] text-text-secondary">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <div className="flex gap-[10px]">
          <label className="flex h-12 items-center pt-[7px] text-[16px] font-medium text-text-secondary">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full flex-1 rounded-lg border border-border-subtle bg-bg-white px-6 py-[15px] text-[16px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
          />
        </div>

        {error && <p className="mt-4 text-[14px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-8">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-lg px-12 py-[15px] text-[16px] font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </div>

        <p className="py-6 text-[16px] text-text-primary">
          <Link to="/sign-in" className="font-medium text-[#0060e3]">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
