import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, EventStatus } from '../../lib/calendarEvents'
import { DOT_CLASS, STATUS_ORDER, worstStatus } from '../../lib/calendarStyles'
import { MD_QUERY, useMediaQuery } from '../../lib/useMediaQuery'
import {
  currentIsoWeek,
  formatWeekRange,
  isoWeekMonth,
  isoWeekOf,
  weeksInIsoYear,
} from '../../lib/weeks'
import { EventList, Legend, SummaryChips, YearNav } from './shared'

const CELL_CLASS: Record<EventStatus, string> = {
  overdue: 'bg-danger-bg text-danger-text',
  missing: 'border border-dashed border-danger-text text-danger-text',
  warning: 'bg-warning-bg text-warning-text',
  upcoming: 'bg-accent/15 text-accent',
  planned: 'border border-accent text-accent',
  done: 'bg-fill text-text-secondary',
}

const NAME_COL = 176
const WEEK_COL = 32

interface WeeksViewProps {
  events: CalendarEvent[]
  clients: { id: string; company_name: string }[]
  clientNameById: Map<string, string>
  year: number
  onYearChange: (year: number) => void
}

interface Selection {
  year: number
  week: number
  clientId: string | null
}

/** A request from a summary chip to bring a week into view (n distinguishes repeat clicks). */
interface Jump {
  year: number
  week: number
  n: number
}

/**
 * The year week by week, Monday to Sunday. Wide screens: a timeline with a row
 * per client and a column per week, so a week with nothing for a client is an
 * empty cell. Phone: one row per week, tap to open it.
 */
export function WeeksView({ events, clients, clientNameById, year, onYearChange }: WeeksViewProps) {
  const isWide = useMediaQuery(MD_QUERY)
  const now = currentIsoWeek()
  const weeks = weeksInIsoYear(year)
  const [sel, setSel] = useState<Selection | null>({ ...now, clientId: null })
  const [open, setOpen] = useState<Set<number>>(() => new Set([now.week]))
  const [jump, setJump] = useState<Jump | null>(null)

  function handleJump(event: CalendarEvent) {
    const w = isoWeekOf(event.date)
    onYearChange(w.year)
    setSel({ ...w, clientId: event.clientId })
    setOpen((prev) => new Set(prev).add(w.week))
    setJump({ ...w, n: Date.now() })
  }

  function toggleWeek(week: number) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(week)) next.add(week)
      return next
    })
  }

  const byWeek = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const event of events) {
      const w = isoWeekOf(event.date)
      if (w.year !== year) continue
      const list = map.get(w.week)
      if (list) list.push(event)
      else map.set(w.week, [event])
    }
    return map
  }, [events, year])

  return (
    <div>
      <SummaryChips events={events} onJump={handleJump} />
      <YearNav
        year={year}
        weeks={weeks}
        onChange={onYearChange}
        onThisWeek={() => onYearChange(now.year)}
      />
      {isWide ? (
        <WeeksTable
          year={year}
          weeks={weeks}
          byWeek={byWeek}
          clients={clients}
          clientNameById={clientNameById}
          sel={sel}
          onSelect={setSel}
          jump={jump}
        />
      ) : (
        <WeeksList
          year={year}
          weeks={weeks}
          byWeek={byWeek}
          clientNameById={clientNameById}
          open={open}
          onToggle={toggleWeek}
          jump={jump}
        />
      )}
      <Legend />
    </div>
  )
}

interface ViewProps {
  year: number
  weeks: number
  byWeek: Map<number, CalendarEvent[]>
  clientNameById: Map<string, string>
}

function WeeksTable({
  year,
  weeks,
  byWeek,
  clients,
  clientNameById,
  sel,
  onSelect,
  jump,
}: ViewProps & {
  clients: WeeksViewProps['clients']
  sel: Selection | null
  onSelect: (s: Selection) => void
  jump: Jump | null
}) {
  const now = currentIsoWeek()
  const scroller = useRef<HTMLDivElement>(null)

  // Open on the current week, or on the week a summary chip asked for.
  useEffect(() => {
    const target = jump && jump.year === year ? jump.week : year === now.year ? now.week : null
    if (target && scroller.current) {
      scroller.current.scrollLeft = Math.max(0, (target - 1) * WEEK_COL - 80)
    }
  }, [year, now.year, now.week, jump])

  const weekNumbers = Array.from({ length: weeks }, (_, i) => i + 1)

  // Consecutive weeks under the same month heading.
  const monthSpans: { month: number; span: number }[] = []
  for (const w of weekNumbers) {
    const month = isoWeekMonth(year, w)
    const last = monthSpans[monthSpans.length - 1]
    if (last && last.month === month) last.span++
    else monthSpans.push({ month, span: 1 })
  }

  const active = sel && sel.year === year ? sel : null
  const selectedEvents = active
    ? (byWeek.get(active.week) ?? []).filter(
        (e) => !active.clientId || e.clientId === active.clientId,
      )
    : []

  const sticky = 'sticky left-0 z-10 bg-bg-row'

  return (
    <>
      <div ref={scroller} className="mx-4 overflow-x-auto rounded-xl bg-bg-row">
        <div
          className="grid w-max"
          style={{ gridTemplateColumns: `${NAME_COL}px repeat(${weeks}, ${WEEK_COL}px)` }}
        >
          <div className={sticky} />
          {monthSpans.map(({ month, span }, i) => (
            <div
              key={i}
              style={{ gridColumn: `span ${span}` }}
              className="truncate border-l-[0.5px] border-border-divider px-1 pt-2 text-[12px] font-semibold text-text-secondary"
            >
              {span >= 2
                ? new Date(2000, month, 1).toLocaleDateString('en-GB', { month: 'short' })
                : ''}
            </div>
          ))}

          <div className={`${sticky} px-4 pb-1 pt-1 text-[12px] text-text-secondary`}>Week</div>
          {weekNumbers.map((w) => {
            const isNow = year === now.year && w === now.week
            const isActive = active?.week === w && !active.clientId
            return (
              <button
                key={w}
                type="button"
                onClick={() => onSelect({ year, week: w, clientId: null })}
                aria-label={`Week ${w}, ${formatWeekRange(year, w)}`}
                title={formatWeekRange(year, w)}
                className="py-1 text-center active:opacity-60"
              >
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                    isNow
                      ? 'bg-accent text-white'
                      : isActive
                        ? 'bg-fill-strong text-text-primary'
                        : 'text-text-secondary'
                  }`}
                >
                  {w}
                </span>
              </button>
            )
          })}

          {clients.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              year={year}
              weekNumbers={weekNumbers}
              byWeek={byWeek}
              now={now}
              active={active}
              onSelect={onSelect}
              stickyClass={sticky}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pb-1 pt-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {active
            ? `Week ${active.week} · ${formatWeekRange(year, active.week)}${
                active.clientId ? ` · ${clientNameById.get(active.clientId) ?? ''}` : ''
              }`
            : 'Select a week'}
        </h3>
      </div>
      {active ? (
        <EventList
          events={selectedEvents}
          clientNameById={active.clientId ? new Map() : clientNameById}
          empty="Nothing this week."
        />
      ) : (
        <p className="ios-empty">Tap a week number, or a cell, to see what's in it.</p>
      )}
    </>
  )
}

function ClientRow({
  client,
  year,
  weekNumbers,
  byWeek,
  now,
  active,
  onSelect,
  stickyClass,
}: {
  client: { id: string; company_name: string }
  year: number
  weekNumbers: number[]
  byWeek: Map<number, CalendarEvent[]>
  now: { year: number; week: number }
  active: Selection | null
  onSelect: (s: Selection) => void
  stickyClass: string
}) {
  const divider = 'border-t-[0.5px] border-border-divider'
  return (
    <>
      <div
        className={`${stickyClass} ${divider} flex items-center truncate px-4 py-1 text-[15px] text-text-primary`}
        title={client.company_name}
      >
        <span className="truncate">{client.company_name}</span>
      </div>
      {weekNumbers.map((w) => {
        const cellEvents = (byWeek.get(w) ?? []).filter((e) => e.clientId === client.id)
        const status = worstStatus(cellEvents)
        const isNow = year === now.year && w === now.week
        const isActive = active?.week === w && active.clientId === client.id
        return (
          <div
            key={w}
            className={`${divider} flex items-center justify-center py-[3px] ${isNow ? 'bg-accent/5' : ''}`}
          >
            {status ? (
              <button
                type="button"
                onClick={() => onSelect({ year, week: w, clientId: client.id })}
                aria-label={`${client.company_name}, week ${w}: ${cellEvents.length} ${cellEvents.length === 1 ? 'event' : 'events'}`}
                className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold active:opacity-60 ${CELL_CLASS[status]} ${
                  isActive ? 'outline outline-2 outline-offset-1 outline-text-primary' : ''
                }`}
              >
                {cellEvents.length > 1 ? cellEvents.length : ''}
              </button>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function WeeksList({
  year,
  weeks,
  byWeek,
  clientNameById,
  open,
  onToggle,
  jump,
}: ViewProps & { open: Set<number>; onToggle: (week: number) => void; jump: Jump | null }) {
  const now = currentIsoWeek()

  // Scroll to the current week, or to the week a summary chip asked for.
  useEffect(() => {
    const target = jump && jump.year === year ? jump.week : year === now.year ? now.week : null
    if (target) document.getElementById(`week-${target}`)?.scrollIntoView({ block: 'center' })
  }, [year, now.year, now.week, jump])

  let lastMonth = -1
  return (
    <div className="flex flex-col">
      {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => {
        const month = isoWeekMonth(year, w)
        const heading = month !== lastMonth
        lastMonth = month
        const list = byWeek.get(w) ?? []
        const isNow = year === now.year && w === now.week
        const isOpen = open.has(w) && list.length > 0
        const present = STATUS_ORDER.filter((s) => list.some((e) => e.status === s))
        return (
          <div key={w} id={`week-${w}`}>
            {heading && (
              <h3 className="px-5 pb-1 pt-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                {new Date(2000, month, 1).toLocaleDateString('en-GB', { month: 'long' })}
              </h3>
            )}
            <div className="ios-group">
              <button
                type="button"
                onClick={() => onToggle(w)}
                disabled={list.length === 0}
                aria-expanded={isOpen}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-[inherit] px-4 py-2 text-left active:bg-fill disabled:active:bg-transparent ${
                  isNow ? 'bg-accent/10' : ''
                }`}
              >
                <span
                  className={`w-9 text-[17px] font-semibold ${isNow ? 'text-accent' : 'text-text-primary'}`}
                >
                  W{w}
                </span>
                <span className="flex-1 text-[15px] text-text-secondary">
                  {formatWeekRange(year, w)}
                  {isNow && <span className="font-semibold text-accent"> · This week</span>}
                </span>
                {list.length > 0 && (
                  <>
                    <span className="flex gap-[3px]">
                      {present.map((s) => (
                        <span key={s} className={`size-[8px] rounded-full ${DOT_CLASS[s]}`} />
                      ))}
                    </span>
                    <span className="w-5 text-right text-[15px] text-text-secondary">
                      {list.length}
                    </span>
                  </>
                )}
              </button>
              {isOpen && (
                <div className="py-2">
                  <EventList
                    events={list}
                    clientNameById={clientNameById}
                    empty="Nothing this week."
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
