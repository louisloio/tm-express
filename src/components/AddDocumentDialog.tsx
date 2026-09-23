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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">Upload document</h2>
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
              Document type
            </label>
            <select
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            >
              {docTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">File</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-[14px] text-text-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Expiry date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Remind me this many days before expiry
            </label>
            <input
              type="number"
              min={0}
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
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
              {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
