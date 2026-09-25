import { Link } from 'react-router-dom'
import { InlineLabel } from '../InlineLabel'
import { RowMenu } from '../RowMenu'
import { formatDate, getDocSlotStatus } from '../../lib/format'
import type { DocType, Document, Driver } from '../../types/database'

interface DriverRowProps {
  clientId: string
  driver: Driver
  docsByType: Map<DocType, Document>
  infringementCount: number
  onEdit: () => void
  onArchive: () => Promise<void>
}

export function DriverRow({
  clientId,
  driver,
  docsByType,
  infringementCount,
  onEdit,
  onArchive,
}: DriverRowProps) {
  const licence = docsByType.get('Licence check')
  const cpc = docsByType.get('CPC')
  const licenceStatus = getDocSlotStatus(licence)
  const cpcStatus = getDocSlotStatus(cpc)

  return (
    <div className="flex items-start gap-1 py-3 pl-4 pr-1">
      <Link
        to={`/clients/${clientId}/drivers/${driver.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2.5 active:opacity-60"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-secondary">Name</span>
          <span className="text-[17px] font-semibold text-text-primary">{driver.name}</span>
        </div>
        <div className="flex flex-col gap-1">
          <InlineLabel
            label="Licence check due"
            value={licence?.expiry_date ? formatDate(licence.expiry_date) : 'Not on file'}
            tone={licenceStatus === 'ok' ? undefined : licenceStatus}
          />
          <InlineLabel
            label="CPC due"
            value={cpc?.expiry_date ? formatDate(cpc.expiry_date) : 'Not on file'}
            tone={cpcStatus === 'ok' ? undefined : cpcStatus}
          />
          <InlineLabel label="Infringements" value={String(infringementCount)} />
        </div>
      </Link>
      <RowMenu onEdit={onEdit} onArchive={onArchive} archiveLabel="Archive driver" />
    </div>
  )
}
