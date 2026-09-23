import { useState } from 'react'
import { Link } from 'react-router-dom'
import backIcon from '../assets/icon-back.svg'
import moreIcon from '../assets/icon-more.svg'

interface TopSubPageProps {
  backTo: string
  title: string
  onEdit?: () => void
  onArchive?: () => Promise<void>
  archiveLabel?: string
}

export function TopSubPage({ backTo, title, onEdit, onArchive, archiveLabel }: TopSubPageProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const hasMenu = !!onEdit || !!onArchive

  async function handleArchive() {
    if (!onArchive) return
    setArchiving(true)
    try {
      await onArchive()
    } finally {
      setArchiving(false)
      setConfirming(false)
      setOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2 bg-bg-app px-6 py-4">
      <Link
        to={backTo}
        aria-label="Back"
        className="flex items-center justify-center rounded-full p-1"
      >
        <img src={backIcon} alt="" className="size-6" />
      </Link>
      <div className="h-6 w-px bg-border-divider" />
      <h1 className="flex-1 truncate text-[16px] font-bold tracking-[-0.32px] text-text-primary">
        {title}
      </h1>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
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
            onClick={() => setConfirming(false)}
            disabled={archiving}
            className="rounded-full border border-border-button px-3 py-1.5 text-[13px] font-medium text-text-primary"
          >
            No
          </button>
        </div>
      ) : (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => (hasMenu ? setOpen((o) => !o) : undefined)}
            disabled={!hasMenu}
            title={hasMenu ? undefined : 'Coming soon'}
            aria-label="More actions"
            className="flex items-center justify-center rounded-full border border-border-button p-2 disabled:opacity-40"
          >
            <img src={moreIcon} alt="" className="size-6" />
          </button>
          {open && (
            <div className="absolute right-0 top-12 z-10 w-36 overflow-hidden rounded-lg border border-border-subtle bg-bg-white shadow-lg">
              {onEdit && (
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
              )}
              {onArchive && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="block w-full px-4 py-2.5 text-left text-[14px] text-danger-text hover:bg-bg-row"
                >
                  {archiveLabel ?? 'Archive'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
