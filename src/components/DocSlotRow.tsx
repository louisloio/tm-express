import { useRef, useState } from 'react'
import { UploadIcon } from './icons'

interface DocSlotRowProps {
  label: string
  value: string
  tone?: 'overdue' | 'warning'
  /** Called with the chosen or dropped file. */
  onFile: (file: File) => void
}

const TONE_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
}

/**
 * A document slot (e.g. "MOT"): tap to choose a file, or drop a file onto it.
 * Either way the parent opens the upload sheet with this slot's type and the
 * file already filled in.
 */
export function DocSlotRow({ label, value, tone, onFile }: DocSlotRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      title={`Upload ${label}`}
      className={`flex w-full items-center gap-3 text-left text-[15px] transition-colors active:bg-fill ${
        dragOver ? 'bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]' : ''
      }`}
    >
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span
        className={`min-w-0 flex-1 break-words text-right ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}
      >
        {dragOver ? 'Drop to upload' : value}
      </span>
      <UploadIcon width={18} height={18} className="shrink-0 text-accent" />
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </button>
  )
}
