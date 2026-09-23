import { useState, type FormEvent } from 'react'
import { INFRINGEMENT_CATEGORIES, INFRINGEMENT_TAXONOMY } from '../lib/infringements'
import { supabase } from '../lib/supabase'
import type { Driver, Infringement, InfringementCategory, Vehicle } from '../types/database'

interface AddInfringementDialogProps {
  clientId: string
  drivers: Driver[]
  vehicles: Vehicle[]
  infringement?: Infringement
  onClose: () => void
  onCreated: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AddInfringementDialog({
  clientId,
  drivers,
  vehicles,
  infringement,
  onClose,
  onCreated,
}: AddInfringementDialogProps) {
  const isEditing = !!infringement
  const [category, setCategory] = useState<InfringementCategory>(
    infringement?.category ?? INFRINGEMENT_CATEGORIES[0],
  )
  const [type, setType] = useState(
    infringement?.type ?? INFRINGEMENT_TAXONOMY[INFRINGEMENT_CATEGORIES[0]].types[0],
  )
  const [driverId, setDriverId] = useState(infringement?.driver_id ?? '')
  const [vehicleId, setVehicleId] = useState(infringement?.vehicle_id ?? '')
  const [date, setDate] = useState(infringement?.date ?? today())
  const [notes, setNotes] = useState(infringement?.notes ?? '')
  const [resolved, setResolved] = useState(infringement?.resolved ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taxonomy = INFRINGEMENT_TAXONOMY[category]
  const showDriver = taxonomy.linksTo === 'driver' || taxonomy.linksTo === 'both'
  const showVehicle = taxonomy.linksTo === 'vehicle' || taxonomy.linksTo === 'both'

  function handleCategoryChange(next: InfringementCategory) {
    setCategory(next)
    setType(INFRINGEMENT_TAXONOMY[next].types[0])
    setDriverId('')
    setVehicleId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      category,
      type,
      driver_id: showDriver && driverId ? driverId : null,
      vehicle_id: showVehicle && vehicleId ? vehicleId : null,
      date,
      notes: notes.trim() || null,
      resolved,
    }

    const { error } = isEditing
      ? await supabase.from('infringements').update(payload).eq('id', infringement.id)
      : await supabase.from('infringements').insert({ client_id: clientId, ...payload })

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
            {isEditing ? 'Edit infringement' : 'Log infringement'}
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
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as InfringementCategory)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            >
              {INFRINGEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            >
              {taxonomy.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {showDriver && (
            <div>
              <label className="mb-1 block text-[14px] font-medium text-text-secondary">
                Driver{taxonomy.linksTo === 'both' ? ' (optional)' : ''}
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required={taxonomy.linksTo === 'driver'}
                className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
              >
                <option value="">
                  {drivers.length === 0 ? 'No drivers on file' : 'Select a driver'}
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showVehicle && (
            <div>
              <label className="mb-1 block text-[14px] font-medium text-text-secondary">
                Vehicle{taxonomy.linksTo === 'both' ? ' (optional)' : ''}
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required={taxonomy.linksTo === 'vehicle'}
                className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
              >
                <option value="">
                  {vehicles.length === 0 ? 'No vehicles on file' : 'Select a vehicle'}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <label className="flex items-center gap-2 text-[14px] font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={resolved}
              onChange={(e) => setResolved(e.target.checked)}
              className="size-4"
            />
            Already resolved
          </label>

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
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Log infringement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
