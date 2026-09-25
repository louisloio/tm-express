interface EditButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

/** Plain iOS text button ("Edit") for nav bars and list rows. */
export function EditButton({ onClick, label = 'Edit', className = '' }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={`shrink-0 rounded-full px-3 py-2 text-[17px] text-accent active:opacity-60 ${className}`}
    >
      {label}
    </button>
  )
}
