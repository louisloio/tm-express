interface InlineLabelProps {
  label: string
  value: string
  danger?: boolean
}

export function InlineLabel({ label, value, danger }: InlineLabelProps) {
  return (
    <div className="flex w-full gap-2">
      <span className="flex-1 text-[14px] font-medium text-text-secondary">{label}</span>
      <span
        className={`flex-1 text-[14px] font-medium ${danger ? 'text-danger-text' : 'text-text-primary'}`}
      >
        {value}
      </span>
    </div>
  )
}
