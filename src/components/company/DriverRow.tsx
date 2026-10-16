import { Link } from 'react-router-dom'
import { DueLabel } from '../DueLabel'
import { InlineLabel } from '../InlineLabel'
import { EditButton } from '../EditButton'
import { formatDate, getDocSlotStatus } from '../../lib/format'
import type { DocType, Document, Driver } from '../../types/database'

interface DriverRowProps {
  clientId: string
  driver: Driver
  docsByType: Map<DocType, Document>
  chasedUntilByType?: Map<DocType, string>
  onCooldownEnd?: () => void
  infringementCount: number
  onEdit: () => void
}

export function DriverRow({
  clientId,
  driver,
  docsByType,
  chasedUntilByType,
  onCooldownEnd,
  infringementCount,
  onEdit,
}: DriverRowProps) {
  const licenceValidity = docsByType.get('Licence validity')
  const licenceCheck = docsByType.get('Licence check')
  const cpc = docsByType.get('CPC')
  const licenceValidityStatus = getDocSlotStatus(licenceValidity)
  const licenceCheckStatus = getDocSlotStatus(licenceCheck)
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
          <DueLabel
            label="Licence validity due"
            value={
              licenceValidity?.expiry_date ? formatDate(licenceValidity.expiry_date) : 'Not on file'
            }
            tone={licenceValidityStatus === 'ok' ? undefined : licenceValidityStatus}
            chasedUntil={chasedUntilByType?.get('Licence validity')}
            onCooldownEnd={onCooldownEnd}
          />
          <DueLabel
            label="Licence check due"
            value={licenceCheck?.expiry_date ? formatDate(licenceCheck.expiry_date) : 'Not on file'}
            tone={licenceCheckStatus === 'ok' ? undefined : licenceCheckStatus}
            chasedUntil={chasedUntilByType?.get('Licence check')}
            onCooldownEnd={onCooldownEnd}
          />
          <DueLabel
            label="CPC due"
            value={cpc?.expiry_date ? formatDate(cpc.expiry_date) : 'Not on file'}
            tone={cpcStatus === 'ok' ? undefined : cpcStatus}
            chasedUntil={chasedUntilByType?.get('CPC')}
            onCooldownEnd={onCooldownEnd}
          />
          <InlineLabel label="Infringements" value={String(infringementCount)} />
        </div>
      </Link>
      <EditButton onClick={onEdit} label="Edit" className="-mt-0.5 !text-[15px]" />
    </div>
  )
}
