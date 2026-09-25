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
    <div className="flex items-start gap-1 py-3 pl-4 pr-1">
      <Link
        to={`/clients/${clientId}/visits/${visit.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2.5 active:opacity-60"
      >
        <span className="text-[17px] font-semibold text-text-primary">Last visit</span>
        <div className="flex flex-col gap-1">
          <InlineLabel label="Date" value={formatDate(visit.date)} />
          <InlineLabel label="Notes" value={visit.notes || '—'} />
        </div>
      </Link>
      <RowMenu onEdit={onEdit} onArchive={onArchive} archiveLabel="Archive visit" />
    </div>
  )
}
