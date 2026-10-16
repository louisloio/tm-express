/** Local calendar-date helpers on YYYY-MM-DD strings (no time zones involved). */

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Noon, so a DST shift can never roll the date over. */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000)
}

/** Calendar-month arithmetic: 1 Jan + 12 months = 1 Jan, and a day that doesn't exist clamps (31 Aug + 6 months = 28 Feb). */
export function addMonthsISO(iso: string, months: number): string {
  const d = parseISODate(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toISODate(d)
}
