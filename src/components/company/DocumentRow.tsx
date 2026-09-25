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
    <div className="flex items-center gap-3 py-3 pl-4 pr-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-fit rounded-full bg-fill px-2.5 py-[3px] text-[12px] font-semibold text-text-secondary">
            {doc.doc_type}
          </span>
          <span className="w-fit rounded-full bg-fill px-2.5 py-[3px] text-[12px] font-semibold text-text-secondary">
            {parentLabel}
          </span>
        </div>
        {doc.file_path ? (
          <button
            type="button"
            onClick={handleOpenFile}
            disabled={opening}
            className="w-fit max-w-full truncate text-left text-[17px] text-accent active:opacity-60 disabled:opacity-60"
          >
            {opening ? 'Opening…' : fileNameFromPath(doc.file_path)}
          </button>
        ) : (
          <span className="text-[17px] text-text-tertiary">No file uploaded</span>
        )}
        <span className="text-[15px] text-text-tertiary">{formatDateTime(doc.uploaded_at)}</span>
        <span className={`text-[15px] ${STATUS_CLASS[status]}`}>
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
              className="rounded-full bg-danger-text px-3.5 py-1.5 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {archiving ? '…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={archiving}
              className="rounded-full bg-fill px-3.5 py-1.5 text-[15px] font-semibold text-accent"
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
            className="ios-icon-btn"
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
    </div>
  )
}
