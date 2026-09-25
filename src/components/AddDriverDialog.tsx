import { useState, type FormEvent } from 'react'
import { ArchiveButton } from './ArchiveButton'
import { supabase } from '../lib/supabase'
import type { Driver } from '../types/database'

interface AddDriverDialogProps {
  clientId: string
  driver?: Driver
  onClose: () => void
  /** Shown as a destructive button at the end of the form when editing. */
  onArchive?: () => Promise<void>
  onCreated: () => void
}

export function AddDriverDialog({
  clientId,
  driver,
  onClose,
  onArchive,
  onCreated,
}: AddDriverDialogProps) {
  const isEditing = !!driver
  const [name, setName] = useState(driver?.name ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = isEditing
      ? await supabase.from('drivers').update({ name: name.trim() }).eq('id', driver.id)
      : await supabase.from('drivers').insert({ client_id: clientId, name: name.trim() })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <div className="ios-backdrop">
      <div className="ios-sheet">
        <div className="ios-sheet-header">
          <h2 className="ios-sheet-title">{isEditing ? 'Edit driver' : 'Add driver'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 ios-btn-primary">
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add driver'}
            </button>
          </div>
          {onArchive && <ArchiveButton label="Archive driver" onArchive={onArchive} />}
        </form>
      </div>
    </div>
  )
}
