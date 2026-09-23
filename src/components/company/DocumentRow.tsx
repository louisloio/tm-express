import { formatDate, isOverdue } from '../../lib/format'
import type { Document } from '../../types/database'

export function DocumentRow({ doc, parentLabel }: { doc: Document; parentLabel: string }) {
  return (
    <div className="flex items-center gap-8 border-b border-border-divider px-6 py-3">
      <div className="flex flex-1 flex-col gap-1">
        <span className="w-fit rounded border border-border-subtle bg-bg-white px-1 py-0.5 text-[12px] font-medium text-text-primary">
          {doc.doc_type}
        </span>
        <span className="text-[14px] font-semibold text-text-primary">{parentLabel}</span>
        <span
          className={`text-[14px] ${isOverdue(doc.expiry_date) ? 'text-danger-text' : 'text-text-tertiary'}`}
        >
          {doc.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : 'No expiry set'}
        </span>
      </div>
    </div>
  )
}
