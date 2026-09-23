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
    <div className="flex min-h-screen flex-col items-center bg-bg-app pt-16">
      <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
      <form onSubmit={handleSubmit} className="flex w-full max-w-[354px] flex-col p-6">
        <p className="pb-6 text-[16px] text-text-secondary">Choose a new password.</p>

        <div className="flex gap-[10px]">
          <label className="flex h-12 items-center pt-[7px] text-[16px] font-medium text-text-secondary">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
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
            {submitting ? 'Saving…' : 'Save new password'}
          </button>
        </div>
      </form>
    </div>
  )
}
