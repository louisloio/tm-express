import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useAuth } from '../context/AuthContext'

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg-app pt-[calc(env(safe-area-inset-top)+64px)]">
      <img src={logo} alt="TM Express" className="h-[26px] w-auto" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col px-4 py-8">
        <p className="pb-6 text-[15px] text-text-secondary">Choose a new password.</p>

        <div className="ios-group !mx-0">
          <label className="ios-row-field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
          </label>
        </div>

        {error && <p className="mt-3 px-1 text-[15px] text-danger-text">{error}</p>}

        <div className="flex flex-col gap-[10px] pt-6">
          <button type="submit" disabled={submitting} className="ios-btn-primary w-full">
            {submitting ? 'Saving…' : 'Save new password'}
          </button>
        </div>
      </form>
    </div>
  )
}
