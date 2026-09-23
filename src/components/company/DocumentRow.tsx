import { formatDate, getDocStatus } from '../../lib/format'
import type { Document } from '../../types/database'

const STATUS_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
  ok: 'text-text-tertiary',
}

export function DocumentRow({ doc, parentLabel }: { doc: Document; parentLabel: string }) {
  const status = getDocStatus(doc.expiry_date, doc.reminder_days_before)
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
    </div>
  )
}
