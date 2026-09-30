import { useEffect, useState, type FormEvent } from 'react'
import { ArchiveButton } from './ArchiveButton'
import { fetchDriverNi, saveDriverNi } from '../lib/driverSecrets'
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
  const [licenceNumber, setLicenceNumber] = useState(driver?.licence_number ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(driver?.date_of_birth ?? '')
  const [niNumber, setNiNumber] = useState('')
  const [niLoading, setNiLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // NI number lives outside the drivers row entirely (see
  // src/lib/driverSecrets.ts) — fetch it once, only here in the edit
  // form, only for the owning user's own driver.
  useEffect(() => {
    if (!driver) return
    let cancelled = false
    setNiLoading(true)
    fetchDriverNi(driver.id).then(({ niNumber: value, error: fetchError }) => {
      if (cancelled) return
      if (!fetchError) setNiNumber(value ?? '')
      setNiLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [driver])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fields = {
      name: name.trim(),
      licence_number: licenceNumber.trim() || null,
      date_of_birth: dateOfBirth || null,
    }

    const { data, error: saveError } = isEditing
      ? await supabase.from('drivers').update(fields).eq('id', driver.id).select('id').single()
      : await supabase
          .from('drivers')
          .insert({ client_id: clientId, ...fields })
          .select('id')
          .single()

    if (saveError || !data) {
      setSubmitting(false)
      setError(saveError?.message ?? 'Could not save this driver.')
      return
    }

    const { error: niError } = await saveDriverNi(data.id, niNumber)
    setSubmitting(false)
    if (niError) {
      setError(`Driver saved, but the NI number failed to save: ${niError}`)
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

          <div>
            <label className="ios-label">Licence number</label>
            <input
              type="text"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              placeholder="Optional"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">National Insurance number</label>
            <input
              type="text"
              value={niNumber}
              onChange={(e) => setNiNumber(e.target.value)}
              placeholder={niLoading ? 'Loading…' : 'Optional'}
              disabled={niLoading}
              autoComplete="off"
              className="ios-field disabled:opacity-60"
            />
            <p className="mt-1.5 px-1 text-[13px] text-text-secondary">
              Encrypted at rest and only ever shown on this driver's own page.
            </p>
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || niLoading}
              className="flex-1 ios-btn-primary"
            >
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add driver'}
            </button>
          </div>
          {onArchive && <ArchiveButton label="Archive driver" onArchive={onArchive} />}
        </form>
      </div>
    </div>
  )
}
