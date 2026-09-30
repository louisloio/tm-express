import { formatCountdown, isCountdownUrgent, useCountdown } from '../lib/useCountdown'
import { InlineLabel } from './InlineLabel'
import { ClockIcon } from './icons'

interface DueLabelProps {
  label: string
  value: string
  tone?: 'overdue' | 'warning'
  /**
   * Still-open chase cooldown for this document slot (todos.snoozed_until
   * from a recent chase), if any. While it's in the future this shows a
   * live countdown alongside `value` — same idea as DocSlotRow, but for
   * read-only summary rows (CompanyPage's vehicle/driver list) rather than
   * an upload target.
   */
  chasedUntil?: string | null
  /** Called once the countdown reaches zero, so the parent can refetch. */
  onCooldownEnd?: () => void
}

const TONE_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
}

/** InlineLabel that grows a live chase countdown alongside its value while one is running. */
export function DueLabel({ label, value, tone, chasedUntil, onCooldownEnd }: DueLabelProps) {
  const remaining = useCountdown(chasedUntil, onCooldownEnd)
  const chasing = !!chasedUntil && remaining > 0
  const urgent = isCountdownUrgent(remaining)

  if (!chasing) {
    return <InlineLabel label={label} value={value} tone={tone} />
  }

  return (
    <div className="flex w-full items-baseline justify-between gap-4 text-[15px]">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right">
        <span className={`break-words ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}>
          {value}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1.5 ${
            urgent ? 'animate-ios-blink text-danger-text' : 'text-accent'
          }`}
        >
          <ClockIcon width={13} height={13} className="shrink-0" />
          <span className="truncate font-medium tabular-nums">{formatCountdown(remaining)}</span>
        </span>
      </span>
    </div>
  )
}
