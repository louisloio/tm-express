import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Mailbox } from '../types/database'

interface AddMailboxDialogProps {
  mailbox?: Mailbox
  onClose: () => void
  onSaved: () => void
}

export function AddMailboxDialog({ mailbox, onClose, onSaved }: AddMailboxDialogProps) {
  const isEditing = !!mailbox
  const [label, setLabel] = useState(mailbox?.label ?? '')
  const [email, setEmail] = useState(mailbox?.email ?? '')
  const [smtpHost, setSmtpHost] = useState(mailbox?.smtp_host ?? '')
  const [smtpPort, setSmtpPort] = useState(String(mailbox?.smtp_port ?? '465'))
  const [smtpSecure, setSmtpSecure] = useState(mailbox?.smtp_secure ?? true)
  const [smtpUsername, setSmtpUsername] = useState(mailbox?.smtp_username ?? '')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gmailHint = smtpHost.toLowerCase().includes('gmail')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEditing && !smtpPassword.trim()) {
      setError('Password is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('save-mailbox', {
      body: {
        mailboxId: mailbox?.id,
        email: email.trim(),
        label: label.trim() || null,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
      },
    })

    setSubmitting(false)

    if (invokeError) {
      setError(invokeError.message)
      return
    }
    if (data?.error) {
      setError(data.error as string)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">
            {isEditing ? 'Edit mailbox' : 'Connect a mailbox'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[20px] leading-none text-text-secondary"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <p className="text-[13px] text-text-secondary">
            Chase emails will be sent literally from this address, using your mail provider's SMTP
            server. Your credentials are encrypted and only used server-side to send mail — TM
            Express never displays your password again after saving.
          </p>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional — e.g. Work"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Email address
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[14px] font-medium text-text-secondary">
                SMTP host
              </label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="mail.yourcompany.com"
                className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[14px] font-medium text-text-secondary">Port</label>
              <input
                type="number"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[14px] text-text-primary">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="size-4"
            />
            Use SSL/TLS (usually on for port 465, off for 587)
          </label>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Username
            </label>
            <input
              type="text"
              required
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder="Usually the same as your email address"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={isEditing ? 'Leave blank to keep current password' : 'Required'}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
            {gmailHint && (
              <p className="mt-1 text-[12px] text-text-tertiary">
                Gmail rejects your normal login password here — use an "app password" from your
                Google Account security settings instead.
              </p>
            )}
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-text-primary disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 rounded-lg px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : isEditing ? 'Save changes' : 'Connect mailbox'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
