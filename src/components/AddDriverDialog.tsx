import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Driver } from '../types/database'

interface AddDriverDialogProps {
  clientId: string
  driver?: Driver
  onClose: () => void
  onCreated: () => void
}

export function AddDriverDialog({ clientId, driver, onClose, onCreated }: AddDriverDialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">
            {isEditing ? 'Edit driver' : 'Add driver'}
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
          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 rounded-lg px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
            >
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
