import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { EditButton } from '../EditButton'
import { formatDate } from '../../lib/format'
import type { Visit } from '../../types/database'

interface LastVisitRowProps {
  clientId: string
  visit: Visit
  onEdit: () => void
}

export function LastVisitRow({ clientId, visit, onEdit }: LastVisitRowProps) {
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
      <EditButton onClick={onEdit} label="Edit" className="-mt-0.5 !text-[15px]" />
    </div>
  )
}
