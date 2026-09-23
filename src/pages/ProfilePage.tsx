import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { TopSubPage } from '../components/TopSubPage'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!user) return null

  const initial = (firstName[0] ?? user.email?.[0] ?? '?').toUpperCase()

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setError(null)
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
    })
    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id)
    setUploading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setAvatarUrl(data.publicUrl)
    void refreshProfile()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim() || null, last_name: lastName.trim() || null })
      .eq('id', user.id)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    void refreshProfile()
  }

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage backTo="/" title="Profile" />

      <div className="mx-auto w-full max-w-[420px] flex-1 px-6 py-4">
        <div className="flex flex-col items-center gap-3 pb-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-accent-from text-[28px] font-medium text-white">
              {initial}
            </span>
          )}
          <label className="cursor-pointer text-[14px] font-medium text-[#0060e3]">
            {uploading ? 'Uploading…' : 'Change picture'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Email
            </label>
            <p className="rounded-lg border border-border-subtle bg-bg-row px-4 py-3 text-[15px] text-text-secondary">
              {user.email}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}
          {saved && <p className="text-[14px] text-success-text">Saved.</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-lg px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 w-full rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-danger-text"
        >
          Sign out
        </button>
      </div>

      <Footer />
    </div>
  )
}
