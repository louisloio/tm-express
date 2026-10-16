import type { CalendarEvent, EventStatus } from './calendarEvents'
import { parseISODate } from './dates'

/** Most urgent first — decides which status a busy day / week / cell shows. */
export const STATUS_ORDER: EventStatus[] = [
  'overdue',
  'missing',
  'warning',
  'upcoming',
  'planned',
  'done',
]

export const DOT_CLASS: Record<EventStatus, string> = {
  overdue: 'bg-danger-text',
  // hollow, so a never-happened cycle reads differently from a late one
  missing: 'ring-[1.5px] ring-inset ring-danger-text',
  warning: 'bg-warning-text',
  upcoming: 'bg-accent',
  // hollow blue: projected from the cadence, not a real due date yet
  planned: 'ring-[1.5px] ring-inset ring-accent',
  done: 'bg-text-tertiary',
}

export const BADGE: Record<EventStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-danger-bg text-danger-text' },
  missing: { label: 'Missing', className: 'bg-danger-bg text-danger-text' },
  warning: { label: 'Due soon', className: 'bg-warning-bg text-warning-text' },
  upcoming: { label: 'Upcoming', className: 'bg-fill text-text-secondary' },
  planned: { label: 'Planned', className: 'bg-fill text-text-secondary' },
  done: { label: 'Done', className: 'bg-success-bg text-success-text' },
}

/** The most urgent status among some events, or null when there are none. */
export function worstStatus(events: CalendarEvent[]): EventStatus | null {
  return STATUS_ORDER.find((s) => events.some((e) => e.status === s)) ?? null
}

export function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = map.get(event.date)
    if (list) list.push(event)
    else map.set(event.date, [event])
  }
  return map
}

export function formatDayHeading(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
