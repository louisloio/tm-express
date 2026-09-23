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
    <div className="flex w-full gap-2">
      <span className="flex-1 text-[14px] font-medium text-text-secondary">{label}</span>
      <span className={`flex-1 text-[14px] font-medium ${tone ? TONE_CLASS[tone] : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  )
}
