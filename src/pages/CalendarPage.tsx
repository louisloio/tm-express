import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarView } from '../components/calendar/CalendarView'
import { ClientFilter } from '../components/calendar/ClientFilter'
import { fetchCalendarData, type CalendarData } from '../lib/calendarEvents'
import { useCalendarFilter } from '../lib/calendarFilter'
import { onDataChanged } from '../lib/dataEvents'
import { MD_QUERY, useMediaQuery } from '../lib/useMediaQuery'

/**
 * Landing page: every client's upcoming and past compliance events in one
 * month view. On wide screens the client filter lives in the sidebar (see
 * Home); on phone it's a button here that opens a sheet.
 */
export function CalendarPage() {
  const isWide = useMediaQuery(MD_QUERY)
  const { isVisible } = useCalendarFilter()
  const [data, setData] = useState<CalendarData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await fetchCalendarData())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => onDataChanged(() => void load()), [load])

  const clients = data?.clients
  const clientNameById = useMemo(
    () => new Map((clients ?? []).map((c) => [c.id, c.company_name])),
    [clients],
  )
  const events = useMemo(
    () => (data?.events ?? []).filter((e) => isVisible(e.clientId)),
    [data, isVisible],
  )
  const hidden = (clients ?? []).filter((c) => !isVisible(c.id)).length

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between pl-5 pr-4 pb-2 pt-4">
        <h1 className="text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-text-primary">
          Calendar
        </h1>
        {!isWide && clients && clients.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="rounded-full bg-fill px-3 py-1.5 text-[15px] font-medium text-accent active:opacity-60"
          >
            {hidden === 0 ? 'All clients' : `${clients.length - hidden} of ${clients.length}`}
          </button>
        )}
      </div>

      {error && <p className="px-5 pb-2 text-[15px] text-danger-text">{error}</p>}

      {!data && !error ? (
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading calendar…</p>
      ) : data ? (
        <CalendarView events={events} clientNameById={clientNameById} />
      ) : null}

      {filterOpen && clients && (
        <div className="ios-backdrop" onClick={() => setFilterOpen(false)}>
          <div className="ios-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-header">
              <h2 className="ios-sheet-title">Filter clients</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Close"
                className="ios-sheet-close"
              >
                ×
              </button>
            </div>
            <div className="pb-5">
              <ClientFilter clients={clients} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Index route: on wide screens the calendar fills the detail pane. */
export function CalendarRoute() {
  const isWide = useMediaQuery(MD_QUERY)
  if (!isWide) return null
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <CalendarPage />
    </div>
  )
}
