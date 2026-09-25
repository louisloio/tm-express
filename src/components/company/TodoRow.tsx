import { Link } from 'react-router-dom'
import type { Todo } from '../../types/database'
import { EnvelopeIcon } from '../icons'

interface TodoRowProps {
  todo: Todo
  href: string
  clientName?: string
  onOpenChase: (todo: Todo) => void
}

export function TodoRow({ todo, href, clientName, onOpenChase }: TodoRowProps) {
  const danger = { className: 'bg-danger-bg text-danger-text' }
  const badge =
    todo.source_type === 'infringement'
      ? { label: 'Infringement', className: 'bg-fill text-text-secondary' }
      : todo.description.includes('missing')
        ? { label: 'Missing Document', ...danger }
        : todo.description.includes('overdue')
          ? { label: 'Overdue Document', ...danger }
          : {
              label: 'Approaching Due Date',
              className: 'bg-warning-bg text-warning-text',
            }

  function handleChaseClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onOpenChase(todo)
  }

  return (
    <Link to={href} className="flex items-center gap-3 py-3 pl-4 pr-1 active:bg-fill">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span
          className={`rounded-full px-2 py-[3px] text-[12px] font-semibold leading-none ${badge.className}`}
        >
          {badge.label}
        </span>
        <span className="text-[17px] font-medium leading-snug text-text-primary">
          {todo.description}
        </span>
        {clientName && <span className="text-[15px] text-text-secondary">{clientName}</span>}
      </div>
      <button
        type="button"
        onClick={handleChaseClick}
        title="Chase"
        aria-label="Chase"
        className="ios-icon-btn"
      >
        <EnvelopeIcon />
      </button>
    </Link>
  )
}
