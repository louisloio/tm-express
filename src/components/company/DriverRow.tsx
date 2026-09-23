import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { formatDate, isOverdue } from '../../lib/format'
import type { DocType, Document, Driver } from '../../types/database'

interface DriverRowProps {
  clientId: string
  driver: Driver
  docsByType: Map<DocType, Document>
  infringementCount: number
}

export function DriverRow({ clientId, driver, docsByType, infringementCount }: DriverRowProps) {
  const licence = docsByType.get('Licence check')
  const cpc = docsByType.get('CPC')

  return (
    <Link
      to={`/clients/${clientId}/drivers/${driver.id}`}
      className="flex gap-2 border-t border-border-divider bg-bg-row px-6 py-3"
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-text-secondary">Name</span>
          <span className="text-[16px] font-semibold text-text-primary">{driver.name}</span>
        </div>
        <div className="flex flex-col gap-1">
          <InlineLabel
            label="Licence check due"
            value={licence?.expiry_date ? formatDate(licence.expiry_date) : 'Not on file'}
            danger={isOverdue(licence?.expiry_date)}
          />
          <InlineLabel
            label="CPC due"
            value={cpc?.expiry_date ? formatDate(cpc.expiry_date) : 'Not on file'}
            danger={isOverdue(cpc?.expiry_date)}
          />
          <InlineLabel label="Infringements" value={String(infringementCount)} />
        </div>
      </div>
    </Link>
  )
}
