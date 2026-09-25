interface MailboxChooserDialogProps {
  onClose: () => void
  onChooseOAuth: (provider: 'google') => void
  onChooseManual: () => void
  connecting: 'google' | 'microsoft' | null
}

export function MailboxChooserDialog({
  onClose,
  onChooseOAuth,
  onChooseManual,
  connecting,
}: MailboxChooserDialogProps) {
  return (
    <div className="ios-backdrop">
      <div className="ios-sheet">
        <div className="ios-sheet-header">
          <h2 className="ios-sheet-title">Connect a mailbox</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <button
            type="button"
            onClick={() => onChooseOAuth('google')}
            disabled={!!connecting}
            className="ios-btn-secondary"
          >
            {connecting === 'google' ? 'Connecting…' : 'Connect Gmail'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border-divider" />
            <span className="text-[12px] text-text-tertiary">or</span>
            <div className="h-px flex-1 bg-border-divider" />
          </div>

          <button
            type="button"
            onClick={onChooseManual}
            disabled={!!connecting}
            className="ios-btn-primary"
          >
            Enter mail server details manually
          </button>
        </div>
      </div>
    </div>
  )
}
