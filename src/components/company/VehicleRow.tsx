import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { RowMenu } from '../RowMenu'
import { formatDate, getDocSlotStatus } from '../../lib/format'
import type { DocType, Document, Vehicle } from '../../types/database'

const DOC_TYPES: { type: DocType; label: string }[] = [
  { type: 'MOT', label: 'MOT due' },
  { type: 'VED', label: 'VED due' },
  { type: 'Insurance', label: 'Insurance due' },
  { type: 'PMI', label: 'PMI due' },
  { type: 'Brake test', label: 'Brake test due' },
]

interface VehicleRowProps {
  clientId: string
  vehicle: Vehicle
  docsByType: Map<DocType, Document>
  onEdit: () => void
  onArchive: () => Promise<void>
}

export function VehicleRow({ clientId, vehicle, docsByType, onEdit, onArchive }: VehicleRowProps) {
  return (
    <div className="flex items-start gap-1 py-3 pl-4 pr-1">
      <Link
        to={`/clients/${clientId}/vehicles/${vehicle.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2.5 active:opacity-60"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-secondary">Registration</span>
          <span className="text-[17px] font-semibold text-text-primary">
            {vehicle.registration}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {DOC_TYPES.map(({ type, label }) => {
            const doc = docsByType.get(type)
            const status = getDocSlotStatus(doc)
            return (
              <InlineLabel
                key={type}
                label={label}
                value={doc?.expiry_date ? formatDate(doc.expiry_date) : 'Not on file'}
                tone={status === 'ok' ? undefined : status}
              />
            )
          })}
        </div>
      </Link>
      <RowMenu onEdit={onEdit} onArchive={onArchive} archiveLabel="Archive vehicle" />
    </div>
  )
}
