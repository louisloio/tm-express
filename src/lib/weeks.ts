import { addDaysISO, daysBetween, parseISODate, toISODate } from './dates'

/**
 * ISO 8601 weeks (the UK convention): weeks start on Monday and week 1 is the
 * week containing 4 January, so a year has 52 or 53 weeks and its first / last
 * few days can belong to the neighbouring year's week numbering.
 */

export interface IsoWeek {
  year: number
  week: number
}

/** The Monday of week 1 of an ISO year. */
function firstMonday(year: number): string {
  const jan4 = `${year}-01-04`
  return addDaysISO(jan4, -((parseISODate(jan4).getDay() + 6) % 7))
}

export function isoWeekOf(iso: string): IsoWeek {
  // The Thursday of a date's week decides which ISO year the week belongs to.
  const d = parseISODate(iso)
  const thursday = addDaysISO(iso, 3 - ((d.getDay() + 6) % 7))
  const year = Number(thursday.slice(0, 4))
  return { year, week: Math.floor(daysBetween(firstMonday(year), thursday) / 7) + 1 }
}

export function weeksInIsoYear(year: number): number {
  // 28 December always falls in the year's last ISO week.
  return isoWeekOf(`${year}-12-28`).week
}

/** Monday of the given ISO week (YYYY-MM-DD). */
export function isoWeekStart(year: number, week: number): string {
  return addDaysISO(firstMonday(year), (week - 1) * 7)
}

export function isoWeekEnd(year: number, week: number): string {
  return addDaysISO(isoWeekStart(year, week), 6)
}

export function currentIsoWeek(): IsoWeek {
  return isoWeekOf(toISODate(new Date()))
}

const SHORT = { day: 'numeric', month: 'short' } as const

/** "12–18 Oct", or "28 Sep–4 Oct" when the week spans two months. */
export function formatWeekRange(year: number, week: number): string {
  const start = parseISODate(isoWeekStart(year, week))
  const end = parseISODate(isoWeekEnd(year, week))
  const sameMonth = start.getMonth() === end.getMonth()
  const from = sameMonth ? String(start.getDate()) : start.toLocaleDateString('en-GB', SHORT)
  return `${from}–${end.toLocaleDateString('en-GB', SHORT)}`
}

/** Month (0–11) a week is shown under: the month of its Thursday, matching the ISO year rule. */
export function isoWeekMonth(year: number, week: number): number {
  return parseISODate(addDaysISO(isoWeekStart(year, week), 3)).getMonth()
}
