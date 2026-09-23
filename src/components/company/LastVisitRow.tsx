import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { RowMenu } from '../RowMenu'
import { formatDate } from '../../lib/format'
import type { Visit } from '../../types/database'

interface LastVisitRowProps {
  clientId: string
  visit: Visit
  onEdit: () => void
  onArchive: () => Promise<void>
}

export function LastVisitRow({ clientId, visit, onEdit, onArchive }: LastVisitRowProps) {
  return (
    <div className="flex items-start gap-2 border-t border-border-divider bg-bg-row px-6 py-3">
      <Link to={`/clients/${clientId}/visits/${visit.id}`} className="flex flex-1 flex-col gap-2">
        <span className="text-[12px] font-semibold text-text-secondary">Last Visit</span>
        <div className="flex flex-col gap-1">
          <InlineLabel label="Date" value={formatDate(visit.date)} />
          <InlineLabel label="Notes" value={visit.notes || '—'} />
        </div>
      </Link>
      <RowMenu onEdit={onEdit} onArchive={onArchive} archiveLabel="Archive visit" />
    </div>
  )
}
