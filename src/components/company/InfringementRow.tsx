import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { formatDate } from '../../lib/format'
import type { Infringement } from '../../types/database'

interface InfringementRowProps {
  clientId: string
  infringement: Infringement
  linkedTo: string
}

export function InfringementRow({ clientId, infringement, linkedTo }: InfringementRowProps) {
  return (
    <Link
      to={`/clients/${clientId}/infringements/${infringement.id}`}
      className="flex gap-2 border-t border-border-divider bg-bg-row px-6 py-3"
    >
      <div className="flex flex-1 flex-col gap-2">
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
            danger={!infringement.resolved}
          />
          <InlineLabel label="Linked to" value={linkedTo} />
          <InlineLabel label="Date" value={formatDate(infringement.date)} />
          <InlineLabel label="Notes" value={infringement.notes || '—'} />
        </div>
      </div>
    </Link>
  )
}
