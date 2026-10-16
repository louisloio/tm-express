import { addDaysISO, daysBetween } from './dates'

/**
 * Expected occurrences of a fixed-cadence check (PMI, brake test, licence
 * check) that never happened.
 *
 * `performed` are the dates it actually was done. A check done late is not a
 * missing one — an occurrence only counts as missing once a whole extra cycle
 * fits between two records (e.g. 6-weekly PMIs 90 days apart: one missing).
 * The cycle after the latest record is the current due date, already shown as
 * overdue by the caller, so after the latest record only the cycles beyond
 * that one are reported, up to `today`.
 *
 * Nothing before the first record is reported: without a record there is no
 * way to know when the schedule started.
 */
export function missingDates(performed: string[], cadenceDays: number, today: string): string[] {
  const dates = [...new Set(performed)].sort()
  const missing: string[] = []

  for (let i = 0; i < dates.length - 1; i++) {
    const cycles = Math.floor(daysBetween(dates[i], dates[i + 1]) / cadenceDays) - 1
    for (let k = 1; k <= cycles; k++) missing.push(addDaysISO(dates[i], cadenceDays * k))
  }

  const last = dates[dates.length - 1]
  if (last) {
    for (let k = 2; ; k++) {
      const due = addDaysISO(last, cadenceDays * k)
      if (due >= today) break
      missing.push(due)
    }
  }

  return missing
}
