import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Visit } from '../types/database'

interface AddVisitDialogProps {
  clientId: string
  visit?: Visit
  onClose: () => void
  onCreated: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AddVisitDialog({ clientId, visit, onClose, onCreated }: AddVisitDialogProps) {
  const isEditing = !!visit
  const [date, setDate] = useState(visit?.date ?? today())
  const [notes, setNotes] = useState(visit?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = isEditing
      ? await supabase
          .from('visits')
          .update({ date, notes: notes.trim() || null })
          .eq('id', visit.id)
      : await supabase.from('visits').insert({
          client_id: clientId,
          date,
          notes: notes.trim() || null,
        })

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
          <h2 className="ios-sheet-title">{isEditing ? 'Edit visit' : 'Log a visit'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Findings from the visit"
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 ios-btn-primary">
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Log visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
