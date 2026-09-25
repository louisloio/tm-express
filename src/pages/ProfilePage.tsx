import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AddMailboxDialog } from '../components/AddMailboxDialog'
import { Footer } from '../components/Footer'
import { MailboxChooserDialog } from '../components/MailboxChooserDialog'
import { RowMenu } from '../components/RowMenu'
import { TopSubPage } from '../components/TopSubPage'
import { useAuth } from '../context/AuthContext'
import { archiveRow } from '../lib/archive'
import { startMailboxOAuth } from '../lib/mailboxOAuth'
import { supabase } from '../lib/supabase'
import type { Mailbox } from '../types/database'

const PROVIDER_LABEL: Record<Mailbox['provider'], string> = {
  smtp: 'Mail server',
  google: 'Gmail',
  microsoft: 'Microsoft',
}

export function ProfilePage() {
  const { user, profile, mailboxes, signOut, refreshProfile, refreshMailboxes } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [mailboxDialog, setMailboxDialog] = useState<
    { mode: 'add' } | { mode: 'edit'; mailbox: Mailbox } | null
  >(null)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<'google' | 'microsoft' | null>(null)
  const [mailboxMessage, setMailboxMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

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

  // Landing back here after the Gmail/Microsoft OAuth redirect — surface
  // the result once, then strip the query params so a refresh doesn't
  // re-trigger the message.
  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('oauth_error')
    if (!connected && !oauthError) return

    if (connected) {
      setMailboxMessage({
        type: 'success',
        text: `${PROVIDER_LABEL[connected as Mailbox['provider']] ?? connected} connected.`,
      })
      void refreshMailboxes()
    } else if (oauthError) {
      setMailboxMessage({ type: 'error', text: oauthError })
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('connected')
        next.delete('oauth_error')
        return next
      },
      { replace: true },
    )
    // Deliberately run once on mount only — this consumes the OAuth
    // redirect's query params, not something to re-run on every render.
  }, [])

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
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
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

  async function handleChooseOAuth(provider: 'google' | 'microsoft', mailboxId?: string) {
    setConnectingProvider(provider)
    const { error } = await startMailboxOAuth(provider, mailboxId)
    if (error) {
      setConnectingProvider(null)
      setMailboxMessage({ type: 'error', text: error })
    }
    // On success the browser is already navigating away — no need to
    // reset connectingProvider, this component is about to unmount.
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <TopSubPage backTo="/" title="Profile" />

      <div className="mx-auto w-full max-w-[420px] flex-1 px-4 py-4">
        <div className="flex flex-col items-center gap-3 pb-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-accent-from text-[32px] font-medium text-white">
              {initial}
            </span>
          )}
          <label className="cursor-pointer text-[17px] text-accent active:opacity-60">
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
          <div className="ios-group !mx-0">
            <div className="ios-row-field">
              <span>Email</span>
              <p className="min-w-0 flex-1 truncate py-3 text-text-secondary">{user.email}</p>
            </div>
            <label className="ios-row-field">
              <span>First name</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="ios-row-field">
              <span>Last name</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          {error && <p className="px-1 text-[15px] text-danger-text">{error}</p>}
          {saved && <p className="px-1 text-[15px] text-success-text">Saved.</p>}

          <button type="submit" disabled={submitting} className="ios-btn-primary w-full">
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between px-1">
            <h2 className="text-[22px] font-bold tracking-[-0.022em] text-text-primary">
              Mailboxes
            </h2>
            <button
              type="button"
              onClick={() => setChooserOpen(true)}
              className="text-[17px] text-accent active:opacity-60"
            >
              Add
            </button>
          </div>
          <p className="mb-3 px-1 text-[13px] text-text-secondary">
            Chase emails are sent literally from one of these addresses — no shared sender, no
            Reply-To trick.
          </p>

          {mailboxMessage && (
            <p
              className={`mb-3 px-1 text-[15px] ${mailboxMessage.type === 'error' ? 'text-danger-text' : 'text-success-text'}`}
            >
              {mailboxMessage.text}
            </p>
          )}

          {mailboxes.length === 0 ? (
            <p className="ios-empty !mx-0">
              No mailbox connected yet. You won't be able to send chase emails until you add one.
            </p>
          ) : (
            <ul className="ios-group !mx-0">
              {mailboxes.map((mailbox) => (
                <li key={mailbox.id} className="flex items-center gap-1 py-2.5 pl-4 pr-1">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[17px] font-medium text-text-primary">
                        {mailbox.label || mailbox.email}
                      </span>
                      {mailbox.is_default && (
                        <span className="rounded-full bg-success-bg px-2 py-[2px] text-[11px] font-semibold text-success-text">
                          Default
                        </span>
                      )}
                      {mailbox.provider !== 'smtp' && (
                        <span className="rounded-full bg-fill px-2 py-[2px] text-[11px] font-semibold text-text-secondary">
                          {PROVIDER_LABEL[mailbox.provider]}
                        </span>
                      )}
                      {mailbox.needs_reauth && (
                        <span className="rounded-full bg-danger-bg px-2 py-[2px] text-[11px] font-semibold text-danger-text">
                          Needs reconnect
                        </span>
                      )}
                    </div>
                    {mailbox.label && (
                      <span className="truncate text-[15px] text-text-secondary">
                        {mailbox.email}
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      {!mailbox.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(mailbox.id)}
                          className="w-fit text-[15px] text-accent"
                        >
                          Set as default
                        </button>
                      )}
                      {mailbox.needs_reauth && mailbox.provider !== 'smtp' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleChooseOAuth(
                              mailbox.provider as 'google' | 'microsoft',
                              mailbox.id,
                            )
                          }
                          disabled={!!connectingProvider}
                          className="w-fit text-[15px] text-danger-text disabled:opacity-60"
                        >
                          {connectingProvider === mailbox.provider ? 'Connecting…' : 'Reconnect'}
                        </button>
                      )}
                    </div>
                  </div>
                  <RowMenu
                    onEdit={
                      mailbox.provider === 'smtp'
                        ? () => setMailboxDialog({ mode: 'edit', mailbox })
                        : undefined
                    }
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
          className="mt-8 w-full rounded-[12px] bg-bg-row px-6 py-3 text-[17px] text-danger-text active:opacity-60"
        >
          Sign out
        </button>
      </div>

      {chooserOpen && (
        <MailboxChooserDialog
          onClose={() => setChooserOpen(false)}
          onChooseOAuth={(provider) => handleChooseOAuth(provider)}
          onChooseManual={() => {
            setChooserOpen(false)
            setMailboxDialog({ mode: 'add' })
          }}
          connecting={connectingProvider}
        />
      )}

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
