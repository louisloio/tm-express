import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddMailboxDialog } from '../components/AddMailboxDialog'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { RowMenu } from '../components/RowMenu'
import { TopSubPage } from '../components/TopSubPage'
import { useAuth } from '../context/AuthContext'
import { archiveRow } from '../lib/archive'
import { supabase } from '../lib/supabase'
import type { Mailbox } from '../types/database'

export function ProfilePage() {
  const { user, profile, mailboxes, signOut, refreshProfile, refreshMailboxes } = useAuth()
  const navigate = useNavigate()

  const [mailboxDialog, setMailboxDialog] = useState<
    { mode: 'add' } | { mode: 'edit'; mailbox: Mailbox } | null
  >(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // `profile` loads asynchronously after this page mounts (e.g. a direct
  // load/refresh of /profile, not just an in-app nav from an already-warm
  // session) — seeding state from it in useState's initializer would lock in
  // '' forever if profile wasn't ready yet. Sync once, the first time it
  // becomes available, so a later refreshProfile() after Save doesn't clobber
  // whatever the user might be mid-editing.
  useEffect(() => {
    if (profile && !initialized) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setAvatarUrl(profile.avatar_url)
      setInitialized(true)
    }
  }, [profile, initialized])

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

  async function handleSetDefault(id: string) {
    await supabase.from('mailboxes').update({ is_default: true }).eq('id', id)
    void refreshMailboxes()
  }

  async function handleArchiveMailbox(id: string) {
    await archiveRow('mailboxes', id)
    void refreshMailboxes()
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

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text-primary">Connected mailboxes</h2>
            <button
              type="button"
              onClick={() => setMailboxDialog({ mode: 'add' })}
              className="text-[14px] font-medium text-[#0060e3]"
            >
              + Add mailbox
            </button>
          </div>
          <p className="mb-3 text-[13px] text-text-secondary">
            Chase emails are sent literally from one of these addresses via your own mail server —
            no shared sender, no Reply-To trick.
          </p>

          {mailboxes.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-bg-row px-4 py-3 text-[14px] text-text-secondary">
              No mailbox connected yet. You won't be able to send chase emails until you add one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mailboxes.map((mailbox) => (
                <li
                  key={mailbox.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-white px-4 py-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-text-primary">
                        {mailbox.label || mailbox.email}
                      </span>
                      {mailbox.is_default && (
                        <span className="rounded border border-transparent bg-success-bg px-1 py-0.5 text-[11px] font-medium text-success-text">
                          Default
                        </span>
                      )}
                    </div>
                    {mailbox.label && (
                      <span className="text-[13px] text-text-secondary">{mailbox.email}</span>
                    )}
                    {!mailbox.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(mailbox.id)}
                        className="w-fit text-[12px] font-medium text-[#0060e3]"
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                  <RowMenu
                    onEdit={() => setMailboxDialog({ mode: 'edit', mailbox })}
                    onArchive={() => handleArchiveMailbox(mailbox.id)}
                    archiveLabel="Disconnect"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 w-full rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-danger-text"
        >
          Sign out
        </button>
      </div>

      {mailboxDialog && (
        <AddMailboxDialog
          mailbox={mailboxDialog.mode === 'edit' ? mailboxDialog.mailbox : undefined}
          onClose={() => setMailboxDialog(null)}
          onSaved={() => {
            setMailboxDialog(null)
            void refreshMailboxes()
          }}
        />
      )}

      <Footer />
    </div>
  )
}
