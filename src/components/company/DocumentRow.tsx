import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fileNameFromPath, formatDate, formatDateTime, getDocStatus } from '../../lib/format'
import type { Document } from '../../types/database'

const STATUS_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
  ok: 'text-text-tertiary',
}

interface DocumentRowProps {
  doc: Document
  parentLabel: string
  onArchive?: () => Promise<void>
}

export function DocumentRow({ doc, parentLabel, onArchive }: DocumentRowProps) {
  const status = getDocStatus(doc.expiry_date, doc.reminder_days_before)
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [opening, setOpening] = useState(false)

  async function handleArchive() {
    if (!onArchive) return
    setArchiving(true)
    try {
      await onArchive()
    } finally {
      setArchiving(false)
      setConfirming(false)
    }
  }

  async function handleOpenFile() {
    if (!doc.file_path || opening) return
    setOpening(true)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)
    setOpening(false)
    if (error || !data) {
      window.alert(`Couldn't open file: ${error?.message ?? 'unknown error'}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex items-center gap-8 border-b border-border-divider px-6 py-3">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="w-fit rounded border border-border-subtle bg-bg-white px-1 py-0.5 text-[12px] font-medium text-text-primary">
            {doc.doc_type}
          </span>
          <span className="w-fit rounded border border-border-subtle bg-bg-white px-1 py-0.5 text-[12px] font-medium text-text-primary">
            {parentLabel}
          </span>
        </div>
        {doc.file_path ? (
          <button
            type="button"
            onClick={handleOpenFile}
            disabled={opening}
            className="w-fit text-left text-[14px] font-semibold text-[#0f69e3] underline-offset-2 hover:underline disabled:opacity-60"
          >
            {opening ? 'Opening…' : fileNameFromPath(doc.file_path)}
          </button>
        ) : (
          <span className="text-[14px] font-semibold text-text-tertiary">No file uploaded</span>
        )}
        <span className="text-[14px] text-text-tertiary">{formatDateTime(doc.uploaded_at)}</span>
        <span className={`text-[14px] ${STATUS_CLASS[status]}`}>
          {doc.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : 'No expiry set'}
        </span>
      </div>
      {onArchive &&
        (confirming ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="rounded-full bg-danger-text px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {archiving ? '…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={archiving}
              className="rounded-full border border-border-button px-3 py-1.5 text-[13px] font-medium text-text-primary"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Archive document"
            title="Archive document"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-button"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
    </div>
  )
}
