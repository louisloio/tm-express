import { useState } from 'react'

interface ArchiveButtonProps {
  /** e.g. "Archive vehicle" */
  label: string
  onArchive: () => Promise<void>
}

/** Destructive action at the foot of an edit sheet, with an inline confirmation. */
export function ArchiveButton({ label, onArchive }: ArchiveButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setWorking(true)
    setError(null)
    try {
      await onArchive()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setWorking(false)
    }
  }

  return (
    <div className="mt-1 border-t-[0.5px] border-border-divider pt-2">
      {confirming ? (
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-center text-[15px] text-text-secondary">
            {label}? It will be removed from your lists.
          </p>
          {error && <p className="text-center text-[15px] text-danger-text">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={working}
              className="ios-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={working}
              className="flex-1 rounded-[14px] bg-danger-text px-6 py-[14px] text-center text-[17px] font-semibold text-white transition-opacity active:opacity-60 disabled:opacity-50"
            >
              {working ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full py-3 text-center text-[17px] text-danger-text active:opacity-60"
        >
          {label}
        </button>
      )}
    </div>
  )
}
