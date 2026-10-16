import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarEvent, EventStatus } from '../../lib/calendarEvents'
import {
  BADGE,
  DOT_CLASS,
  STATUS_ORDER,
  formatDayHeading,
  groupByDate,
} from '../../lib/calendarStyles'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

export function EventRow({ event, clientName }: { event: CalendarEvent; clientName?: string }) {
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

interface EventListProps {
  events: CalendarEvent[]
  clientNameById: Map<string, string>
  /** Heading per date — off when the list already is a single day. */
  dateHeadings?: boolean
  empty: string
}

/** Events as grouped iOS lists, one group per date, in date order. */
export function EventList({ events, clientNameById, dateHeadings = true, empty }: EventListProps) {
  const groups = useMemo(
    () => [...groupByDate(events)].sort(([a], [b]) => a.localeCompare(b)),
    [events],
  )
  if (groups.length === 0) return <p className="ios-empty">{empty}</p>
  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, list]) => (
        <section key={date}>
          {dateHeadings && (
            <h4 className="px-5 pb-1 text-[15px] font-semibold text-text-primary">
              {formatDayHeading(date)}
            </h4>
          )}
          <ul className="ios-group">
            {list.map((event) => (
              <li key={event.id}>
                <EventRow event={event} clientName={clientNameById.get(event.clientId)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function Legend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-4 text-[12px] text-text-secondary">
      {STATUS_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={`size-[6px] rounded-full ${DOT_CLASS[s]}`} />
          {BADGE[s].label}
        </span>
      ))}
    </p>
  )
}

const CHIPS: { status: EventStatus; label: string; className: string }[] = [
  { status: 'overdue', label: 'overdue', className: 'bg-danger-bg text-danger-text' },
  { status: 'missing', label: 'missing', className: 'bg-danger-bg text-danger-text' },
  { status: 'warning', label: 'due soon', className: 'bg-warning-bg text-warning-text' },
]

/**
 * "‹ 11 overdue ›" — counts the items needing attention and steps through them
 * in date order, each step bringing that exact item into view (the view
 * decides how). Before the first step, ‹ goes to the most recent item and › to
 * the oldest.
 */
export function SummaryChips({
  events,
  onJump,
}: {
  events: CalendarEvent[]
  onJump: (event: CalendarEvent) => void
}) {
  // The item each chip is currently on, by id — it survives filter changes
  // that don't remove the item, and resets itself when one does.
  const [focus, setFocus] = useState<Partial<Record<EventStatus, string>>>({})

  const lists = useMemo(
    () =>
      CHIPS.map((chip) => ({
        ...chip,
        list: events
          .filter((e) => e.status === chip.status)
          .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
      })).filter((c) => c.list.length > 0),
    [events],
  )

  if (lists.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-5 pb-3">
      {lists.map(({ status, label, className, list }) => {
        const index = list.findIndex((e) => e.id === focus[status])
        const go = (i: number) => {
          setFocus((prev) => ({ ...prev, [status]: list[i].id }))
          onJump(list[i])
        }
        // Zeros: the widest digit, so no real number can outgrow the template.
        const widest = '0'.repeat(String(list.length).length)
        const prev = index === -1 ? list.length - 1 : index - 1
        const next = index === -1 ? 0 : index + 1
        return (
          <div
            key={status}
            className={`flex items-center rounded-full text-[13px] font-semibold ${className}`}
          >
            <button
              type="button"
              onClick={() => go(prev)}
              disabled={prev < 0}
              aria-label={`Previous ${label} item`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full active:opacity-60 disabled:opacity-30"
            >
              <ChevronLeftIcon width={15} height={15} />
            </button>
            <button
              type="button"
              onClick={() => go(index === -1 ? prev : index)}
              className="grid px-0.5 py-1 tabular-nums active:opacity-60"
            >
              {/* The widest label this chip can show ("N of N …") is laid out
                  invisibly in the same grid cell, so the chip keeps one width
                  whatever the position or count — 11 items or hundreds. */}
              <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                {widest} of {widest} {label}
              </span>
              <span className="col-start-1 row-start-1 text-center">
                {index === -1 ? list.length : `${index + 1} of ${list.length}`} {label}
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(next)}
              disabled={next >= list.length}
              aria-label={`Next ${label} item`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full active:opacity-60 disabled:opacity-30"
            >
              <ChevronRightIcon width={15} height={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** ‹ 2026 › with a "This week" shortcut, for the two year-long views. */
export function YearNav({
  year,
  weeks,
  onChange,
  onThisWeek,
}: {
  year: number
  weeks: number
  onChange: (year: number) => void
  onThisWeek: () => void
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-2">
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-text-primary">
          {year}
        </h2>
        <p className="text-[13px] text-text-secondary">{weeks} weeks · Monday start</p>
      </div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onThisWeek}
          className="px-2 text-[15px] text-accent active:opacity-60"
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => onChange(year - 1)}
          aria-label="Previous year"
          className="ios-icon-btn"
        >
          <ChevronLeftIcon width={22} height={22} />
        </button>
        <button
          type="button"
          onClick={() => onChange(year + 1)}
          aria-label="Next year"
          className="ios-icon-btn"
        >
          <ChevronRightIcon width={22} height={22} />
        </button>
      </div>
    </div>
  )
}
