import type { DocType } from '../types/database'
import { addDaysISO } from './dates'

/**
 * How often each recurring document / check comes round. One source of truth
 * for the upload dialog's suggested expiry and for the calendar.
 *
 * No entry for 'Licence validity' — a photocard's own expiry is printed on
 * the licence and varies per driver, so it's typed in rather than predicted.
 */
export const DOC_CADENCE_DAYS: Partial<Record<DocType, number>> = {
  MOT: 365,
  VED: 365,
  Insurance: 365,
  PMI: 42, // every 6 weeks (all current clients)
  'Brake test': 42, // every 6 weeks (all current clients)
  'Licence check': 182, // every 6 months
  CPC: 1825, // 5 years
}

/** A depot visit is due once a year per client. */
export const VISIT_CADENCE_DAYS = 365

/** Document types that appear on the calendar (they carry an expiry / next-due date). */
export const CALENDAR_DOC_TYPES: DocType[] = [
  'MOT',
  'VED',
  'Insurance',
  'PMI',
  'Brake test',
  'Licence validity',
  'Licence check',
  'CPC',
]

/**
 * Fixed-cadence checks where the date it was actually done matters (stored
 * in documents.checked_date): the next due date counts from it, and a cycle
 * with no record is flagged as missing on the calendar. Expiry-driven
 * documents (MOT, VED, insurance, CPC, licence) don't need it.
 */
export const PERFORMED_DOC_TYPES: DocType[] = ['PMI', 'Brake test', 'Licence check']

export function isPerformedDocType(docType: DocType): boolean {
  return PERFORMED_DOC_TYPES.includes(docType)
}

/** "Date checked" for a licence check, "Date performed" for inspections. */
export function performedDateLabel(docType: DocType): string {
  return docType === 'Licence check' ? 'Date checked' : 'Date performed'
}

/**
 * When a cadence-tracked check was done. Documents saved before the date was
 * recorded fall back to expiry minus one cycle, which is how the upload
 * dialog used to suggest the expiry in the first place.
 */
export function performedDateOf(doc: {
  doc_type: DocType
  checked_date: string | null
  expiry_date: string | null
}): string | null {
  if (doc.checked_date) return doc.checked_date
  const cadence = DOC_CADENCE_DAYS[doc.doc_type]
  return doc.expiry_date && cadence ? addDaysISO(doc.expiry_date, -cadence) : null
}
