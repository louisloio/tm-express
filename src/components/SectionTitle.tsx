import { PlusIcon } from './icons'

interface SectionTitleProps {
  title: string
  onAdd?: () => void
  addLabel?: string
}

/** Prominent section header (Apple "Title 2") with an optional trailing add glyph. */
export function SectionTitle({ title, onAdd, addLabel }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 pb-1 pl-5 pr-2 pt-6">
      <h2 className="ios-section-title flex-1">{title}</h2>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel ?? `Add to ${title}`}
          title={addLabel}
          className="ios-icon-btn"
        >
          <PlusIcon width={24} height={24} />
        </button>
      )}
    </div>
  )
}
