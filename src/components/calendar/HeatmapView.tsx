import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, EventStatus } from '../../lib/calendarEvents'
import { formatDayHeading, groupByDate, worstStatus } from '../../lib/calendarStyles'
import { addDaysISO, toISODate } from '../../lib/dates'
import {
  currentIsoWeek,
  formatWeekRange,
  isoWeekMonth,
  isoWeekOf,
  isoWeekStart,
  weeksInIsoYear,
} from '../../lib/weeks'
import { EventList, SummaryChips, YearNav } from './shared'

const CELL = 14
const GAP = 3
const PITCH = CELL + GAP
/** Height of the month-name row above the grid. */
const MONTH_ROW = 18
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/** Colour is the day's most urgent status; opacity is how busy the day is. */
const HEAT_CLASS: Record<EventStatus, string> = {
  overdue: 'bg-danger-text',
  missing: 'ring-[1.5px] ring-inset ring-danger-text',
  warning: 'bg-warning-text',
  upcoming: 'bg-accent',
  planned: 'ring-[1.5px] ring-inset ring-accent',
  done: 'bg-text-tertiary',
}

function intensity(count: number): number {
  return count >= 4 ? 1 : count >= 2 ? 0.7 : 0.45
}

interface HeatmapViewProps {
  events: CalendarEvent[]
  clientNameById: Map<string, string>
  year: number
  onYearChange: (year: number) => void
}

/** The year as a GitHub-style grid: a column per week, a row per weekday, one square per day. */
export function HeatmapView({ events, clientNameById, year, onYearChange }: HeatmapViewProps) {
  const today = toISODate(new Date())
  const now = currentIsoWeek()
  const weeks = weeksInIsoYear(year)
  const isCurrentYear = year === now.year
  const byDate = useMemo(() => groupByDate(events), [events])
  const [selected, setSelected] = useState<string | null>(today)
  const scroller = useRef<HTMLDivElement>(null)
  // Set by a summary chip: the week to bring into view (n makes repeat clicks count).
  const [jump, setJump] = useState<{ year: number; week: number; n: number } | null>(null)

  useEffect(() => {
    const target = jump && jump.year === year ? jump.week : year === now.year ? now.week : null
    if (target && scroller.current) {
      scroller.current.scrollLeft = Math.max(0, (target - 1) * PITCH - 60)
    }
  }, [year, now.year, now.week, jump])

  function handleJump(event: CalendarEvent) {
    const w = isoWeekOf(event.date)
    onYearChange(w.year)
    setSelected(event.date)
    setJump({ ...w, n: Date.now() })
  }

  const weekNumbers = Array.from({ length: weeks }, (_, i) => i + 1)

  // A month label sits above the first week that belongs to it.
  const monthStarts = new Map<number, number>()
  let prev = -1
  for (const w of weekNumbers) {
    const m = isoWeekMonth(year, w)
    if (m !== prev) monthStarts.set(w, m)
    prev = m
  }

  const yearEvents = useMemo(
    () => events.filter((e) => isoWeekOf(e.date).year === year),
    [events, year],
  )
  const selectedEvents = selected ? (byDate.get(selected) ?? []) : []

  return (
    <div>
      <SummaryChips events={events} onJump={handleJump} />
      <YearNav
        year={year}
        weeks={weeks}
        onChange={onYearChange}
        onThisWeek={() => {
          onYearChange(now.year)
          setSelected(today)
        }}
      />

      <div className="mx-4 flex rounded-xl bg-bg-row py-3 pl-3">
        <div
          className="flex shrink-0 flex-col pr-2 text-[10px] text-text-secondary"
          style={{ paddingTop: MONTH_ROW, gap: GAP }}
        >
          {DAY_LABELS.map((label, i) => (
            <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
              {label}
            </span>
          ))}
        </div>

        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1 pr-3">
          <div className="relative w-max">
            {/* Current week: a tinted band behind its column, labelled below. */}
            {isCurrentYear && (
              <div
                aria-hidden="true"
                className="absolute rounded-lg bg-accent/15"
                style={{
                  left: (now.week - 1) * PITCH - 3,
                  top: MONTH_ROW - 3,
                  width: CELL + 6,
                  height: 7 * CELL + 6 * GAP + 6,
                }}
              />
            )}
            <div className="relative" style={{ height: MONTH_ROW }}>
              {[...monthStarts].map(([w, m]) => (
                <span
                  key={w}
                  className="absolute top-0 text-[11px] font-medium text-text-secondary"
                  style={{ left: (w - 1) * PITCH }}
                >
                  {new Date(2000, m, 1).toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              ))}
            </div>
            <div
              className="relative grid"
              style={{
                gridAutoFlow: 'column',
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {weekNumbers.flatMap((w) =>
                Array.from({ length: 7 }, (_, d) => {
                  const date = addDaysISO(isoWeekStart(year, w), d)
                  const dayEvents = byDate.get(date) ?? []
                  const status = worstStatus(dayEvents)
                  const isSelected = date === selected
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelected(isSelected ? null : date)}
                      aria-label={`${formatDayHeading(date)}, week ${w}: ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                      title={`${formatDayHeading(date)} · W${w}`}
                      className={`rounded-[3px] ${status ? HEAT_CLASS[status] : 'bg-fill'} ${
                        date === today
                          ? 'outline outline-2 outline-offset-1 outline-text-primary'
                          : ''
                      } ${isSelected ? 'outline outline-2 outline-offset-1 outline-accent' : ''}`}
                      style={status ? { opacity: intensity(dayEvents.length) } : undefined}
                    />
                  )
                }),
              )}
            </div>
            {isCurrentYear && (
              <div className="relative" style={{ height: 16 }}>
                <span
                  className="absolute top-1 -translate-x-1/2 text-[10px] font-semibold text-accent"
                  style={{ left: (now.week - 1) * PITCH + CELL / 2 }}
                >
                  W{now.week}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 text-[12px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          Fewer
          {[0.45, 0.7, 1].map((o) => (
            <span
              key={o}
              className="size-[10px] rounded-[3px] bg-text-secondary"
              style={{ opacity: o }}
            />
          ))}
          More events
        </span>
        <span>Colour = most urgent status that day</span>
      </p>

      <div className="px-5 pb-1 pt-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {selected
            ? `${formatDayHeading(selected)} · W${isoWeekOf(selected).week} (${formatWeekRange(
                isoWeekOf(selected).year,
                isoWeekOf(selected).week,
              )})`
            : `${yearEvents.length} events in ${year}`}
        </h3>
      </div>
      {selected ? (
        <EventList
          events={selectedEvents}
          clientNameById={clientNameById}
          dateHeadings={false}
          empty="Nothing on this day."
        />
      ) : (
        <p className="ios-empty">Tap a day to see what's on it.</p>
      )}
    </div>
  )
}
