import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { DocParentType, DocType } from '../types/database'

// Typical renewal interval per doc type, used to auto-suggest an expiry date
// (spec section 5: "auto-suggested ... but always editable").
const DEFAULT_INTERVAL_DAYS: Partial<Record<DocType, number>> = {
  MOT: 365,
  VED: 365,
  Insurance: 365,
  PMI: 56,
  'Brake test': 90,
  'Licence check': 365,
  CPC: 1825,
}

function suggestExpiry(docType: DocType): string {
  const days = DEFAULT_INTERVAL_DAYS[docType]
  if (!days) return ''
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

interface AddDocumentDialogProps {
  clientId: string
  parentType: DocParentType
  parentId: string
  docTypes: DocType[]
  onClose: () => void
  onCreated: () => void
}

export function AddDocumentDialog({
  clientId,
  parentType,
  parentId,
  docTypes,
  onClose,
  onCreated,
}: AddDocumentDialogProps) {
  const { user } = useAuth()
  const [docType, setDocType] = useState<DocType>(docTypes[0])
  const [expiryDate, setExpiryDate] = useState(suggestExpiry(docTypes[0]))
  const [reminderDays, setReminderDays] = useState(14)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleDocTypeChange(next: DocType) {
    setDocType(next)
    setExpiryDate(suggestExpiry(next))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Choose a file to upload.')
      return
    }
    if (!user) return

    setSubmitting(true)
    setError(null)

    const path = `${user.id}/${clientId}/${parentType}/${parentId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      setSubmitting(false)
      setError(uploadError.message)
      return
    }

    const { error: insertError } = await supabase.from('documents').insert({
      client_id: clientId,
      parent_type: parentType,
      parent_id: parentId,
      doc_type: docType,
      file_path: path,
      expiry_date: expiryDate || null,
      reminder_days_before: reminderDays,
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
            <label className="ios-label">File</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-[14px] text-text-primary"
            />
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
              {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
