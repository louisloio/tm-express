import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarView } from '../components/calendar/CalendarView'
import { ClientFilter } from '../components/calendar/ClientFilter'
import { HeatmapView } from '../components/calendar/HeatmapView'
import { WeeksView } from '../components/calendar/WeeksView'
import { fetchCalendarData, type CalendarData } from '../lib/calendarEvents'
import { useCalendarFilter } from '../lib/calendarFilter'
import { onDataChanged } from '../lib/dataEvents'
import { MD_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { currentIsoWeek } from '../lib/weeks'

type View = 'month' | 'weeks' | 'heatmap'

const VIEWS: { id: View; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'heatmap', label: 'Heatmap' },
]

const VIEW_KEY = 'tmx:calendar-view'

function loadView(): View {
  try {
    const stored = localStorage.getItem(VIEW_KEY)
    if (VIEWS.some((v) => v.id === stored)) return stored as View
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'weeks' // users work through the clients week by week
}

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
  const [view, setView] = useState<View>(loadView)
  const [year, setYear] = useState(() => currentIsoWeek().year)

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
  const visibleClients = useMemo(
    () => (clients ?? []).filter((c) => isVisible(c.id)),
    [clients, isVisible],
  )
  const hidden = (clients ?? []).length - visibleClients.length

  function chooseView(next: View) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Not persisted — fine.
    }
  }

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

      <div className="px-4 pb-3">
        <div role="tablist" aria-label="Calendar view" className="ios-segmented max-w-[420px]">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => chooseView(v.id)}
              className="ios-segment"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-5 pb-2 text-[15px] text-danger-text">{error}</p>}

      {!data && !error ? (
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading calendar…</p>
      ) : data ? (
        view === 'month' ? (
          <CalendarView events={events} clientNameById={clientNameById} />
        ) : view === 'weeks' ? (
          <WeeksView
            events={events}
            clients={visibleClients}
            clientNameById={clientNameById}
            year={year}
            onYearChange={setYear}
          />
        ) : (
          <HeatmapView
            events={events}
            clientNameById={clientNameById}
            year={year}
            onYearChange={setYear}
          />
        )
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
    <div className="min-w-0 w-full">
      <CalendarPage />
    </div>
  )
}
