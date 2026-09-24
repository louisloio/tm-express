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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">Connect a mailbox</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[20px] leading-none text-text-secondary"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <button
            type="button"
            onClick={() => onChooseOAuth('google')}
            disabled={!!connecting}
            className="flex items-center justify-center gap-2 rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-text-primary disabled:opacity-60"
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
            className="btn-primary rounded-lg px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
          >
            Enter mail server details manually
          </button>
        </div>
      </div>
    </div>
  )
}
