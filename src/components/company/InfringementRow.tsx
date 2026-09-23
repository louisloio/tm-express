import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { RowMenu } from '../RowMenu'
import { formatDate } from '../../lib/format'
import type { Infringement } from '../../types/database'

interface InfringementRowProps {
  clientId: string
  infringement: Infringement
  linkedTo: string
  onEdit: () => void
  onArchive: () => Promise<void>
}

export function InfringementRow({
  clientId,
  infringement,
  linkedTo,
  onEdit,
  onArchive,
}: InfringementRowProps) {
  return (
    <div className="flex items-start gap-2 border-t border-border-divider bg-bg-row px-6 py-3">
      <Link
        to={`/clients/${clientId}/infringements/${infringement.id}`}
        className="flex flex-1 flex-col gap-2"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-text-secondary">
            {infringement.category}
          </span>
          <span className="text-[16px] font-semibold text-text-primary">
            {infringement.type}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <InlineLabel
            label="Status"
            value={infringement.resolved ? 'Resolved' : 'Open'}
            tone={infringement.resolved ? undefined : 'overdue'}
          />
          <InlineLabel label="Linked to" value={linkedTo} />
          <InlineLabel label="Date" value={formatDate(infringement.date)} />
          <InlineLabel label="Notes" value={infringement.notes || '—'} />
        </div>
      </Link>
      <RowMenu onEdit={onEdit} onArchive={onArchive} archiveLabel="Archive infringement" />
    </div>
  )
}
