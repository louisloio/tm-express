import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { formatDate } from '../../lib/format'
import type { Visit } from '../../types/database'

export function LastVisitRow({ clientId, visit }: { clientId: string; visit: Visit }) {
  return (
    <Link
      to={`/clients/${clientId}/visits/${visit.id}`}
      className="flex gap-2 border-t border-border-divider bg-bg-row px-6 py-3"
    >
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-[12px] font-semibold text-text-secondary">Last Visit</span>
        <div className="flex flex-col gap-1">
          <InlineLabel label="Date" value={formatDate(visit.date)} />
          <InlineLabel label="Notes" value={visit.notes || '—'} />
        </div>
      </div>
    </Link>
  )
}
