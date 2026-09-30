import { useState } from 'react'
import { formatCountdown, isCountdownUrgent, useCountdown } from '../lib/useCountdown'
import { ClockIcon, UploadIcon } from './icons'

interface DocSlotRowProps {
  label: string
  value: string
  tone?: 'overdue' | 'warning'
  /**
   * Still-open chase cooldown for this slot (todos.snoozed_until from a
   * recent chase), if any. While it's in the future the row shows a live
   * countdown instead of `value`.
   */
  chasedUntil?: string | null
  /** Called once the countdown reaches zero, so the parent can refetch. */
  onCooldownEnd?: () => void
  /** Called on a plain tap/click — opens the upload sheet with no file chosen yet. */
  onOpen: () => void
  /** Called with a file dropped directly onto the row — opens the upload sheet with it pre-filled. */
  onFile: (file: File) => void
}

const TONE_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
}

/**
 * A document slot (e.g. "MOT"): tap it to open the upload sheet empty, or
 * drop a file straight onto it to open the sheet with that file already
 * filled in. While a chase is in its 3-day cooldown, shows a live countdown
 * alongside "Not on file" / "Expires ..." — the underlying due date still
 * matters even while a chase is pending, so it stays visible rather than
 * being replaced.
 */
export function DocSlotRow({
  label,
  value,
  tone,
  chasedUntil,
  onCooldownEnd,
  onOpen,
  onFile,
}: DocSlotRowProps) {
  const [dragOver, setDragOver] = useState(false)
  const remaining = useCountdown(chasedUntil, onCooldownEnd)
  const chasing = !!chasedUntil && remaining > 0
  const urgent = isCountdownUrgent(remaining)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      title={
        chasing ? `Chased — resolves automatically when a file is uploaded` : `Upload ${label}`
      }
      className={`flex w-full items-center gap-3 text-left text-[15px] transition-colors active:bg-fill ${
        dragOver ? 'bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]' : ''
      }`}
    >
      <span className="shrink-0 text-text-secondary">{label}</span>
      {chasing ? (
        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right">
          <span className={`break-words ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}>
            {value}
          </span>
          <span
            className={`flex shrink-0 items-center gap-1.5 ${
              urgent ? 'animate-ios-blink text-danger-text' : 'text-accent'
            }`}
          >
            <ClockIcon width={15} height={15} className="shrink-0" />
            <span className="truncate font-medium tabular-nums">{formatCountdown(remaining)}</span>
          </span>
        </span>
      ) : (
        <span
          className={`min-w-0 flex-1 break-words text-right ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}
        >
          {dragOver ? 'Drop to upload' : value}
        </span>
      )}
      <UploadIcon width={18} height={18} className="shrink-0 text-accent" />
    </button>
  )
}
