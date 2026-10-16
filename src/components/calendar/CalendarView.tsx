import { useMemo, useState } from 'react'
import type { CalendarEvent } from '../../lib/calendarEvents'
import { DOT_CLASS, STATUS_ORDER, formatDayHeading, groupByDate } from '../../lib/calendarStyles'
import { parseISODate, toISODate } from '../../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'
import { EventList, Legend, SummaryChips } from './shared'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarViewProps {
  events: CalendarEvent[]
  clientNameById: Map<string, string>
}

/** The month grid: a day-by-day view with the month's (or selected day's) events beneath. */
export function CalendarView({ events, clientNameById }: CalendarViewProps) {
  const today = toISODate(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = useMemo(() => groupByDate(events), [events])

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

  const listed = useMemo(
    () => events.filter((e) => (selected ? e.date === selected : e.date.startsWith(monthPrefix))),
    [events, selected, monthPrefix],
  )

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(null)
  }

  function goToEvent(event: CalendarEvent) {
    const d = parseISODate(event.date)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(event.date)
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
    <div className="mx-auto w-full max-w-[720px]">
      <SummaryChips events={events} onJump={goToEvent} />

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

      <EventList
        events={listed}
        clientNameById={clientNameById}
        dateHeadings={!selected}
        empty={selected ? 'Nothing on this day.' : 'Nothing this month.'}
      />

      <Legend />
    </div>
  )
}
