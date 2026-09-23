import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
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
}

export function VehicleRow({ clientId, vehicle, docsByType }: VehicleRowProps) {
  return (
    <Link
      to={`/clients/${clientId}/vehicles/${vehicle.id}`}
      className="flex gap-2 border-t border-border-divider bg-bg-row px-6 py-3"
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-text-secondary">Registration</span>
          <span className="text-[16px] font-semibold text-text-primary">
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
      </div>
    </Link>
  )
}
