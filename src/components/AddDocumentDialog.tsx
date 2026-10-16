import { useState, type FormEvent } from 'react'
import { FileDropzone } from './FileDropzone'
import { useAuth } from '../context/AuthContext'
import { documentDateLabel, isPerformedDocType, shiftByCadence } from '../lib/cadence'
import { toISODate } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { DocParentType, DocType } from '../types/database'

function today(): string {
  return toISODate(new Date())
}

// The renewal cadence per doc type (src/lib/cadence.ts) auto-fills the expiry
// date (spec section 5: "auto-suggested ... but always editable"), counted
// from the date performed — e.g. PMI 1 Oct → 12 Nov, MOT 1 Jan 2026 → 1 Jan 2027.
// Types with no fixed cadence (licence validity) are left for the TM to type.
function suggestExpiry(docType: DocType, performed: string): string {
  return shiftByCadence(docType, performed || today()) ?? ''
}

interface AddDocumentDialogProps {
  clientId: string
  parentType: DocParentType
  parentId: string
  docTypes: DocType[]
  /** Pre-selected slot and file when the upload starts from a document row. */
  initialDocType?: DocType
  initialFile?: File
  onClose: () => void
  onCreated: () => void
}

export function AddDocumentDialog({
  clientId,
  parentType,
  parentId,
  docTypes,
  initialDocType,
  initialFile,
  onClose,
  onCreated,
}: AddDocumentDialogProps) {
  const { user } = useAuth()
  const [docType, setDocType] = useState<DocType>(initialDocType ?? docTypes[0])
  const firstType = initialDocType ?? docTypes[0]
  // The date the document is dated — when the check / test / issue actually
  // happened, which can be well before it's uploaded (stored in
  // documents.checked_date, see supabase/011_driver_fields.sql). Defaults to
  // today for PMI / brake test / licence check, which drive the next due date.
  const [performedDate, setPerformedDate] = useState(isPerformedDocType(firstType) ? today() : '')
  const [expiryDate, setExpiryDate] = useState(suggestExpiry(firstType, performedDate))
  const [reminderDays, setReminderDays] = useState(14)
  const [file, setFile] = useState<File | null>(initialFile ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLicenceCheck = docType === 'Licence check'

  function handleDocTypeChange(next: DocType) {
    const performed = isPerformedDocType(next) ? today() : ''
    setDocType(next)
    setPerformedDate(performed)
    setExpiryDate(suggestExpiry(next, performed))
  }

  function handlePerformedChange(value: string) {
    setPerformedDate(value)
    // Re-base the expiry on the new date. Still always editable afterwards —
    // typing in the expiry field just overrides this suggestion.
    if (value) setExpiryDate(suggestExpiry(docType, value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    // The file is optional — a document can be logged with just its dates
    // and the file attached later (file_path is nullable; DocumentRow shows
    // "No file uploaded" for those).
    let path: string | null = null
    if (file) {
      path = `${user.id}/${clientId}/${parentType}/${parentId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) {
        setSubmitting(false)
        setError(uploadError.message)
        return
      }
    }

    const { error: insertError } = await supabase.from('documents').insert({
      client_id: clientId,
      parent_type: parentType,
      parent_id: parentId,
      doc_type: docType,
      file_path: path,
      expiry_date: expiryDate || null,
      reminder_days_before: reminderDays,
      checked_date: performedDate || null,
    })
    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated()
  }

  return (
    <div className="ios-backdrop">
      <div className="ios-sheet">
        <div className="ios-sheet-header">
          <h2 className="ios-sheet-title">Upload document</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">File (optional)</label>
            <FileDropzone file={file} onChange={setFile} />
          </div>

          <div>
            <label className="ios-label">Document type</label>
            <select
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
              className="ios-field"
            >
              {docTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ios-label">{documentDateLabel(docType)}</label>
            <input
              type="date"
              value={performedDate}
              max={today()}
              onChange={(e) => handlePerformedChange(e.target.value)}
              className="ios-field"
            />
            {isLicenceCheck && (
              <p className="mt-1.5 px-1 text-[13px] text-text-secondary">
                Perform the check at{' '}
                <a
                  href="https://www.gov.uk/check-driving-licence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent"
                >
                  gov.uk/check-driving-licence
                </a>
                , then upload the licence summary it gives you.
              </p>
            )}
          </div>

          <div>
            <label className="ios-label">Expiry date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Remind me this many days before expiry</label>
            <input
              type="number"
              min={0}
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 ios-btn-primary">
              {submitting ? (file ? 'Uploading…' : 'Saving…') : file ? 'Upload' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
