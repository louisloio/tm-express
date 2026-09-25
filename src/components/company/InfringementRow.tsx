import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { EditButton } from '../EditButton'
import { formatDate } from '../../lib/format'
import type { Infringement } from '../../types/database'

interface InfringementRowProps {
  clientId: string
  infringement: Infringement
  linkedTo: string
  onEdit: () => void
}

export function InfringementRow({
  clientId,
  infringement,
  linkedTo,
  onEdit,
}: InfringementRowProps) {
  return (
    <div className="flex items-start gap-1 py-3 pl-4 pr-1">
      <Link
        to={`/clients/${clientId}/infringements/${infringement.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2.5 active:opacity-60"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-secondary">{infringement.category}</span>
          <span className="text-[17px] font-semibold text-text-primary">{infringement.type}</span>
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
      <EditButton onClick={onEdit} label="Edit" className="-mt-0.5 !text-[15px]" />
    </div>
  )
}
