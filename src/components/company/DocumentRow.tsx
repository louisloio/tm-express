import { useState } from 'react'
import { formatDate, getDocStatus } from '../../lib/format'
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

  return (
    <div className="flex items-center gap-8 border-b border-border-divider px-6 py-3">
      <div className="flex flex-1 flex-col gap-1">
        <span className="w-fit rounded border border-border-subtle bg-bg-white px-1 py-0.5 text-[12px] font-medium text-text-primary">
          {doc.doc_type}
        </span>
        <span className="text-[14px] font-semibold text-text-primary">{parentLabel}</span>
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
