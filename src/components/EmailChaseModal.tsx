import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  buildAllOutstandingTemplate,
  buildSingleTodoTemplate,
  recordChase,
  sendChaseEmail,
} from '../lib/emailChase'
import type { ClientContact, EmailChaseScope, Todo } from '../types/database'

interface EmailChaseModalProps {
  clientId: string
  clientName: string
  contacts: ClientContact[]
  scope: EmailChaseScope
  todo?: Todo
  todos?: Todo[]
  onClose: () => void
  onSent: () => void
}

export function EmailChaseModal({
  clientId,
  clientName,
  contacts,
  scope,
  todo,
  todos,
  onClose,
  onSent,
}: EmailChaseModalProps) {
  const { mailboxes } = useAuth()

  const template =
    scope === 'single_todo' && todo
      ? buildSingleTodoTemplate(todo, clientName)
      : buildAllOutstandingTemplate(todos ?? [], clientName)

  const defaultMailbox = mailboxes.find((m) => m.is_default) ?? mailboxes[0]
  const [mailboxId, setMailboxId] = useState(defaultMailbox?.id ?? '')
  const [to, setTo] = useState(contacts.map((c) => c.email).join(', '))
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedMailbox = mailboxes.find((m) => m.id === mailboxId)

  async function handleChase() {
    if (!selectedMailbox) {
      setError('Select a mailbox to send from.')
      return
    }

    const recipients = to
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    if (recipients.length === 0) {
      setError('Add at least one recipient.')
      return
    }
    if (!subject.trim() || !body.trim()) {
      setError('Subject and content are required.')
      return
    }

    setSubmitting(true)
    setError(null)

    const sendResult = await sendChaseEmail({
      mailboxId: selectedMailbox.id,
      to: recipients,
      subject,
      body,
    })
    if (sendResult.error) {
      setSubmitting(false)
      setError(sendResult.error)
      return
    }

    const recordResult = await recordChase({
      clientId,
      scope,
      todoId: scope === 'single_todo' ? todo?.id : undefined,
      recipients,
      subject,
      body,
      fromEmail: selectedMailbox.email,
    })
    setSubmitting(false)
    if (recordResult.error) {
      setError(`Email sent, but failed to update the todo: ${recordResult.error}`)
      return
    }
    onSent()
  }

  if (mailboxes.length === 0) {
    return (
      <div className="ios-backdrop">
        <div className="ios-sheet">
          <div className="ios-sheet-header">
            <h2 className="ios-sheet-title">Chase</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
              ×
            </button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
            <p className="text-[14px] text-text-secondary">
              Connect a mailbox in your profile to send chase emails — chases are sent literally
              from your own address via your mail server, so there's nothing to send from yet.
            </p>
            <Link to="/profile" onClick={onClose} className="ios-btn-primary">
              Go to profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ios-backdrop">
      <div className="ios-sheet">
        <div className="ios-sheet-header">
          <h2 className="ios-sheet-title">Chase</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">From</label>
            <select
              value={mailboxId}
              onChange={(e) => setMailboxId(e.target.value)}
              className="ios-field"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label ? `${m.label} — ${m.email}` : m.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-text-tertiary">
              Sent for real via your connected mailbox's own mail server — the client sees this
              address literally, not a proxy.
            </p>
          </div>

          <div>
            <label className="ios-label">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 ios-btn-secondary"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleChase}
              disabled={submitting}
              className="flex-1 ios-btn-primary"
            >
              {submitting ? 'Sending…' : 'Chase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
