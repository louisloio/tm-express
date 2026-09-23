import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Todo } from '../../types/database'

interface TodoRowProps {
  todo: Todo
  href: string
  clientName?: string
  onChase: (todo: Todo) => Promise<void>
}

export function TodoRow({ todo, href, clientName, onChase }: TodoRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [chasing, setChasing] = useState(false)

  const danger = { className: 'border-transparent bg-danger-bg text-danger-text' }
  const badge =
    todo.source_type === 'infringement'
      ? { label: 'Infringement', className: 'border-border-subtle bg-bg-white text-text-primary' }
      : todo.description.includes('missing')
        ? { label: 'Missing Document', ...danger }
        : todo.description.includes('overdue')
          ? { label: 'Overdue Document', ...danger }
          : {
              label: 'Approaching Due Date',
              className: 'border-transparent bg-warning-bg text-warning-text',
            }

  function stop(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function confirmChase(e: React.MouseEvent) {
    stop(e)
    setChasing(true)
    try {
      await onChase(todo)
      // On success the todo drops out of the list on refetch (snoozed), so
      // there's nothing further to reset here.
    } catch {
      setChasing(false)
      setConfirming(false)
    }
  }

  return (
    <Link
      to={href}
      className="flex items-center gap-8 border-t border-border-divider bg-bg-row px-6 py-3"
    >
      <div className="flex flex-1 flex-col gap-1">
        <span className={`w-fit rounded border px-1 py-0.5 text-[12px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-[14px] font-semibold text-text-primary">{todo.description}</span>
        {clientName && <span className="text-[14px] text-text-secondary">{clientName}</span>}
      </div>
      {todo.source_type === 'document' &&
        (confirming ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[13px] text-text-secondary">Chase?</span>
            <button
              type="button"
              onClick={confirmChase}
              disabled={chasing}
              aria-label="Confirm chase"
              className="rounded-full bg-accent-to px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {chasing ? '…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                stop(e)
                setConfirming(false)
              }}
              disabled={chasing}
              aria-label="Cancel"
              className="rounded-full border border-border-button px-3 py-1.5 text-[13px] font-medium text-text-primary"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              setConfirming(true)
            }}
            title="Chase"
            aria-label="Chase"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-button"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
              <path
                d="M3 6h18v12H3z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M3 6l9 7 9-7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
    </Link>
  )
}
