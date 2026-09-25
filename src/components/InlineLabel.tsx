interface InlineLabelProps {
  label: string
  value: string
  tone?: 'overdue' | 'warning'
}

const TONE_CLASS: Record<string, string> = {
  overdue: 'text-danger-text',
  warning: 'text-warning-text',
}

export function InlineLabel({ label, value, tone }: InlineLabelProps) {
  return (
    <div className="flex w-full items-baseline justify-between gap-4 text-[15px]">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span
        className={`min-w-0 break-words text-right ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}
      >
        {value}
      </span>
    </div>
  )
}
