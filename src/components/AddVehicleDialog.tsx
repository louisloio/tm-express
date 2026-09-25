import { useState, type FormEvent } from 'react'
import { ArchiveButton } from './ArchiveButton'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types/database'

interface AddVehicleDialogProps {
  clientId: string
  vehicle?: Vehicle
  onClose: () => void
  /** Shown as a destructive button at the end of the form when editing. */
  onArchive?: () => Promise<void>
  onCreated: () => void
}

export function AddVehicleDialog({
  clientId,
  vehicle,
  onClose,
  onArchive,
  onCreated,
}: AddVehicleDialogProps) {
  const isEditing = !!vehicle
  const [registration, setRegistration] = useState(vehicle?.registration ?? '')
  const [type, setType] = useState(vehicle?.type ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = isEditing
      ? await supabase
          .from('vehicles')
          .update({
            registration: registration.trim(),
            type: type.trim() || null,
          })
          .eq('id', vehicle.id)
      : await supabase.from('vehicles').insert({
          client_id: clientId,
          registration: registration.trim(),
          type: type.trim() || null,
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
          <h2 className="ios-sheet-title">{isEditing ? 'Edit vehicle' : 'Add vehicle'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">Registration</label>
            <input
              type="text"
              required
              autoFocus
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder="e.g. AB19 CDE"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Optional — e.g. Rigid, Artic, Trailer"
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 ios-btn-primary">
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add vehicle'}
            </button>
          </div>
          {onArchive && <ArchiveButton label="Archive vehicle" onArchive={onArchive} />}
        </form>
      </div>
    </div>
  )
}
