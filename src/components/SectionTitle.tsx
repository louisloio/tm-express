import plusIcon from '../assets/icon-plus.svg'

interface SectionTitleProps {
  title: string
  onAdd?: () => void
  addLabel?: string
}

export function SectionTitle({ title, onAdd, addLabel }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 border-t border-border-divider px-6 py-4">
      <h2 className="flex-1 text-[16px] font-bold tracking-[-0.32px] text-text-primary">
        {title}
      </h2>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel ?? `Add to ${title}`}
          title={addLabel}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-button"
        >
          <img src={plusIcon} alt="" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
