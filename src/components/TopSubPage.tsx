import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, EllipsisCircleIcon } from './icons'

interface ExtraAction {
  label: string
  onClick: () => void
}

interface TopSubPageProps {
  backTo: string
  title: string
  onEdit?: () => void
  onArchive?: () => Promise<void>
  archiveLabel?: string
  extraAction?: ExtraAction
}

/** Detail-screen navigation bar: back chevron, inline title, trailing menu. */
export function TopSubPage({
  backTo,
  title,
  onEdit,
  onArchive,
  archiveLabel,
  extraAction,
}: TopSubPageProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const hasMenu = !!onEdit || !!onArchive || !!extraAction

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

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
    <header className="ios-bar sticky top-0 z-30 border-b-[0.5px] border-border-divider pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-12 w-full max-w-[600px] lg:max-w-[720px] items-center gap-1 px-2">
        <Link
          to={backTo}
          aria-label="Back"
          className={`ios-icon-btn -ml-0.5 !w-10 active:opacity-60 ${backTo === '/' ? 'md:hidden' : ''}`}
        >
          <ChevronLeftIcon width={26} height={26} />
        </Link>
        <h1
          className={`flex-1 truncate text-[17px] font-semibold tracking-[-0.022em] text-text-primary ${backTo === '/' ? 'md:pl-3' : ''}`}
        >
          {title}
        </h1>

        {confirming ? (
          <div className="flex shrink-0 items-center gap-2 pr-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
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
        ) : (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => (hasMenu ? setOpen((o) => !o) : undefined)}
              disabled={!hasMenu}
              title={hasMenu ? undefined : 'Coming soon'}
              aria-label="More actions"
              aria-expanded={open}
              className="ios-icon-btn disabled:opacity-40"
            >
              <EllipsisCircleIcon />
            </button>
            {open && (
              <div className="ios-menu absolute right-1 top-11 z-30 w-[240px]">
                {extraAction && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      extraAction.onClick()
                    }}
                    className="ios-menu-item"
                  >
                    {extraAction.label}
                  </button>
                )}
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
                {onArchive && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="ios-menu-item destructive"
                  >
                    {archiveLabel ?? 'Archive'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
