import { useEffect, useRef, useState } from 'react'
import { EllipsisIcon } from './icons'

interface RowMenuProps {
  onEdit?: () => void
  onArchive: () => Promise<void>
  archiveLabel: string
}

/** Trailing "more" button on list rows — opens an iOS-style context menu. */
export function RowMenu({ onEdit, onArchive, archiveLabel }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

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
        <button
          type="button"
          onClick={(e) => {
            stop(e)
            setConfirming(false)
          }}
          disabled={archiving}
          className="rounded-full bg-fill px-3.5 py-1.5 text-[15px] font-semibold text-accent active:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="rounded-full bg-danger-text px-3.5 py-1.5 text-[15px] font-semibold text-white active:opacity-60 disabled:opacity-50"
        >
          {archiving ? '…' : 'Archive'}
        </button>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative shrink-0" onClick={stop}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-expanded={open}
        className="ios-icon-btn text-text-tertiary"
      >
        <EllipsisIcon />
      </button>
      {open && (
        <div className="ios-menu absolute right-0 top-11 z-30 w-[220px]">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
              className="ios-menu-item"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ios-menu-item destructive"
          >
            {archiveLabel}
          </button>
        </div>
      )}
    </div>
  )
}
