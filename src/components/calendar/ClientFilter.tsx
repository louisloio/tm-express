import { useCalendarFilter } from '../../lib/calendarFilter'
import { CheckmarkIcon } from '../icons'
import type { Client } from '../../types/database'

interface ClientFilterProps {
  clients: Pick<Client, 'id' | 'company_name'>[]
}

/** Checklist of clients whose events show on the calendar (Settings-style group). */
export function ClientFilter({ clients }: ClientFilterProps) {
  const { isVisible, toggle, showAll, hideAll } = useCalendarFilter()
  const allVisible = clients.every((c) => isVisible(c.id))

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-1 pt-3">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          Clients
        </span>
        <button
          type="button"
          onClick={() => (allVisible ? hideAll(clients.map((c) => c.id)) : showAll())}
          className="text-[15px] text-accent active:opacity-60"
        >
          {allVisible ? 'Hide all' : 'Show all'}
        </button>
      </div>
      {clients.length === 0 ? (
        <p className="px-5 py-4 text-[15px] text-text-secondary">No clients yet.</p>
      ) : (
        <ul className="ios-group">
          {clients.map((client) => {
            const visible = isVisible(client.id)
            return (
              <li key={client.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={visible}
                  onClick={() => toggle(client.id)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-[inherit] py-2 pl-4 pr-4 text-left active:bg-fill"
                >
                  <span className="min-w-0 flex-1 break-words text-[17px] text-text-primary">
                    {client.company_name}
                  </span>
                  <span className="flex size-6 shrink-0 items-center justify-center text-accent">
                    {visible && <CheckmarkIcon width={20} height={20} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
