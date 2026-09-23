import { useState } from 'react'
import moreIcon from '../assets/icon-more.svg'

interface RowMenuProps {
  onEdit: () => void
  onArchive: () => Promise<void>
  archiveLabel: string
}

export function RowMenu({ onEdit, onArchive, archiveLabel }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)

  function stop(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleArchive(e: React.MouseEvent) {
    stop(e)
    setArchiving(true)
    try {
      await onArchive()
    } finally {
      setArchiving(false)
      setConfirming(false)
      setOpen(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2" onClick={stop}>
        <span className="text-[13px] text-text-secondary">Archive?</span>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="rounded-full bg-danger-text px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {archiving ? '…' : 'Yes'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e)
            setConfirming(false)
          }}
          disabled={archiving}
          className="rounded-full border border-border-button px-3 py-1.5 text-[13px] font-medium text-text-primary"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="relative shrink-0" onClick={stop}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        className="flex size-10 items-center justify-center rounded-full border border-border-button"
      >
        <img src={moreIcon} alt="" className="size-6" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-10 w-36 overflow-hidden rounded-lg border border-border-subtle bg-bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="block w-full px-4 py-2.5 text-left text-[14px] text-text-primary hover:bg-bg-row"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="block w-full px-4 py-2.5 text-left text-[14px] text-danger-text hover:bg-bg-row"
          >
            {archiveLabel}
          </button>
        </div>
      )}
    </div>
  )
}
