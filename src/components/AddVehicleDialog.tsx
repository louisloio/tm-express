import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types/database'

interface AddVehicleDialogProps {
  clientId: string
  vehicle?: Vehicle
  onClose: () => void
  onCreated: () => void
}

export function AddVehicleDialog({ clientId, vehicle, onClose, onCreated }: AddVehicleDialogProps) {
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
          .update({ registration: registration.trim(), type: type.trim() || null })
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">
            {isEditing ? 'Edit vehicle' : 'Add vehicle'}
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
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Registration
            </label>
            <input
              type="text"
              required
              autoFocus
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder="e.g. AB19 CDE"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Optional — e.g. Rigid, Artic, Trailer"
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
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
