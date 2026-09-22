import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
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
      <div className="flex min-h-screen flex-col items-center bg-bg-app pt-16">
        <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
        <div className="mt-12 w-full max-w-[354px] p-6 text-center">
          <p className="text-[16px] text-text-primary">
            Check <strong>{email}</strong> to confirm your account, then sign in.
          </p>
          <Link
            to="/sign-in"
            className="btn-primary mt-8 inline-block w-full rounded-lg px-12 py-[15px] text-[16px] font-medium text-white"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg-app pt-16">
      <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[354px] flex-col p-6">
        <div className="flex gap-[10px]">
          <div className="flex flex-col gap-[10px] pt-[7px]">
            <label className="flex h-12 items-center text-[16px] font-medium text-text-secondary">
              Email
            </label>
            <label className="flex h-12 items-center text-[16px] font-medium text-text-secondary">
              Password
            </label>
          </div>
          <div className="flex flex-1 flex-col gap-[10px]">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-6 py-[15px] text-[16px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-6 py-[15px] text-[16px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-[14px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-12">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-lg px-12 py-[15px] text-[16px] font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </div>

        <p className="py-6 text-[16px] text-text-primary">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-[#0060e3]">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
