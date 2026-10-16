import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarEvent, EventStatus } from '../../lib/calendarEvents'
import { parseISODate, toISODate } from '../../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Most urgent first — decides which dots a day cell shows. */
const STATUS_ORDER: EventStatus[] = ['overdue', 'missing', 'warning', 'upcoming', 'done']

const DOT_CLASS: Record<EventStatus, string> = {
  overdue: 'bg-danger-text',
  // hollow, so a never-happened cycle reads differently from a late one
  missing: 'ring-[1.5px] ring-inset ring-danger-text',
  warning: 'bg-warning-text',
  upcoming: 'bg-accent',
  done: 'bg-text-tertiary',
}

const BADGE: Record<EventStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-danger-bg text-danger-text' },
  missing: { label: 'Missing', className: 'bg-danger-bg text-danger-text' },
  warning: { label: 'Due soon', className: 'bg-warning-bg text-warning-text' },
  upcoming: { label: 'Upcoming', className: 'bg-fill text-text-secondary' },
  done: { label: 'Done', className: 'bg-success-bg text-success-text' },
}

function formatDayHeading(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

interface CalendarViewProps {
  events: CalendarEvent[]
  clientNameById: Map<string, string>
  showClientName?: boolean
}

export function CalendarView({ events, clientNameById, showClientName = true }: CalendarViewProps) {
  const today = toISODate(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = map.get(event.date)
      if (list) list.push(event)
      else map.set(event.date, [event])
    }
    return map
  }, [events])

  const counts = useMemo(() => {
    let overdue = 0
    let missing = 0
    let soon = 0
    let oldestOverdue: string | null = null
    let oldestMissing: string | null = null
    let nextSoon: string | null = null
    for (const event of events) {
      if (event.status === 'overdue') {
        overdue++
        if (!oldestOverdue || event.date < oldestOverdue) oldestOverdue = event.date
      } else if (event.status === 'missing') {
        missing++
        if (!oldestMissing || event.date < oldestMissing) oldestMissing = event.date
      } else if (event.status === 'warning') {
        soon++
        if (!nextSoon || event.date < nextSoon) nextSoon = event.date
      }
    }
    return { overdue, missing, soon, oldestOverdue, oldestMissing, nextSoon }
  }, [events])

  const { year, month } = cursor
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${monthPrefix}${String(i + 1).padStart(2, '0')}`,
    ),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const listDates = selected
    ? [selected]
    : [...byDate.keys()].filter((d) => d.startsWith(monthPrefix)).sort()

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(null)
  }

  function goToMonthOf(iso: string) {
    const d = parseISODate(iso)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(null)
  }

  function goToToday() {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setSelected(today)
  }

  const monthTitle = new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {(counts.overdue > 0 || counts.missing > 0 || counts.soon > 0) && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {counts.overdue > 0 && (
            <button
              type="button"
              onClick={() => counts.oldestOverdue && goToMonthOf(counts.oldestOverdue)}
              className="rounded-full bg-danger-bg px-2.5 py-1 text-[13px] font-semibold text-danger-text active:opacity-60"
            >
              {counts.overdue} overdue
            </button>
          )}
          {counts.missing > 0 && (
            <button
              type="button"
              onClick={() => counts.oldestMissing && goToMonthOf(counts.oldestMissing)}
              className="rounded-full bg-danger-bg px-2.5 py-1 text-[13px] font-semibold text-danger-text active:opacity-60"
            >
              {counts.missing} missing
            </button>
          )}
          {counts.soon > 0 && (
            <button
              type="button"
              onClick={() => counts.nextSoon && goToMonthOf(counts.nextSoon)}
              className="rounded-full bg-warning-bg px-2.5 py-1 text-[13px] font-semibold text-warning-text active:opacity-60"
            >
              {counts.soon} due soon
            </button>
          )}
        </div>
      )}

      <div className="ios-group px-2 pb-2 pt-1">
        <div className="flex items-center justify-between pb-1 pl-2">
          <h2 className="text-[17px] font-semibold text-text-primary">{monthTitle}</h2>
          <div className="flex items-center">
            <button
              type="button"
              onClick={goToToday}
              className="px-2 text-[15px] text-accent active:opacity-60"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="ios-icon-btn"
            >
              <ChevronLeftIcon width={22} height={22} />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="ios-icon-btn"
            >
              <ChevronRightIcon width={22} height={22} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-medium text-text-secondary">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />
            const dayEvents = byDate.get(date) ?? []
            const statuses = STATUS_ORDER.filter((s) => dayEvents.some((e) => e.status === s))
            const isToday = date === today
            const isSelected = date === selected
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(isSelected ? null : date)}
                aria-pressed={isSelected}
                aria-label={`${formatDayHeading(date)}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                className={`flex h-[50px] flex-col items-center gap-1 rounded-xl pt-1.5 active:opacity-60 ${
                  isSelected ? 'bg-fill-strong' : ''
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[17px] ${
                    isToday ? 'bg-accent font-semibold text-white' : 'text-text-primary'
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="flex h-[6px] gap-[3px]">
                  {statuses.map((s) => (
                    <span key={s} className={`size-[6px] rounded-full ${DOT_CLASS[s]}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {selected ? formatDayHeading(selected) : `Events in ${monthTitle}`}
        </h3>
        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-[15px] text-accent active:opacity-60"
          >
            Show month
          </button>
        )}
      </div>

      {listDates.every((d) => !byDate.has(d)) ? (
        <p className="ios-empty">{selected ? 'Nothing on this day.' : 'Nothing this month.'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {listDates
            .filter((d) => byDate.has(d))
            .map((date) => (
              <section key={date}>
                {!selected && (
                  <h4 className="px-5 pb-1 text-[15px] font-semibold text-text-primary">
                    {formatDayHeading(date)}
                  </h4>
                )}
                <ul className="ios-group">
                  {byDate.get(date)!.map((event) => (
                    <li key={event.id}>
                      <EventRow
                        event={event}
                        clientName={showClientName ? clientNameById.get(event.clientId) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      <p className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-4 text-[12px] text-text-secondary">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`size-[6px] rounded-full ${DOT_CLASS[s]}`} />
            {BADGE[s].label}
          </span>
        ))}
      </p>
    </div>
  )
}

function EventRow({ event, clientName }: { event: CalendarEvent; clientName?: string }) {
  const badge = BADGE[event.status]
  return (
    <Link
      to={event.href}
      className={`flex items-center gap-3 rounded-[inherit] py-3 pl-4 pr-3 active:bg-fill ${
        event.status === 'done' ? 'opacity-70' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-medium leading-snug text-text-primary">
          {event.title}
          {event.subject && <span className="text-text-secondary"> · {event.subject}</span>}
        </span>
        {clientName && <span className="text-[15px] text-text-secondary">{clientName}</span>}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-[3px] text-[12px] font-semibold leading-none ${badge.className}`}
      >
        {badge.label}
      </span>
    </Link>
  )
}
