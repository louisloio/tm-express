import {
  CALENDAR_DOC_TYPES,
  DOC_CADENCE_DAYS,
  VISIT_CADENCE_DAYS,
  isPerformedDocType,
  performedDateOf,
} from './cadence'
import { addDaysISO, toISODate } from './dates'
import { isMoreCurrent } from './documents'
import { missingDates } from './gaps'
import { supabase } from './supabase'
import type { Client, Document, Driver, Vehicle, Visit } from '../types/database'

/**
 * - overdue:  due date has passed and nothing newer replaced it
 * - warning:  inside the reminder window (a todo is, or is about to be, open)
 * - upcoming: due later
 * - done:     a past item that a newer document / visit has since replaced
 * - missing:  a cycle of a fixed-cadence check (PMI…) that has no record at all
 */
export type EventStatus = 'overdue' | 'missing' | 'warning' | 'upcoming' | 'done'

export interface CalendarEvent {
  id: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  clientId: string
  title: string
  /** Vehicle registration or driver name, when the event belongs to one. */
  subject: string | null
  status: EventStatus
  href: string
}

/** Visits warn this many days ahead (documents use their own reminder_days_before). */
const VISIT_WARNING_DAYS = 30

function statusFor(date: string, today: string, warnDays: number | null): EventStatus {
  if (date < today) return 'overdue'
  if (warnDays != null && addDaysISO(date, -warnDays) <= today) return 'warning'
  return 'upcoming'
}

// PostgREST caps a response at 1000 rows and document history grows without
// bound, so page through instead of trusting a single select.
const PAGE_SIZE = 1000

async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export interface CalendarData {
  clients: Client[]
  events: CalendarEvent[]
}

export async function fetchCalendarData(): Promise<CalendarData> {
  const [clients, vehicles, drivers, documents, visits] = await Promise.all([
    fetchAll<Client>((from, to) =>
      supabase
        .from('clients')
        .select('*')
        .is('archived_at', null)
        .order('company_name')
        .order('id')
        .range(from, to),
    ),
    fetchAll<Vehicle>((from, to) =>
      supabase.from('vehicles').select('*').is('archived_at', null).order('id').range(from, to),
    ),
    fetchAll<Driver>((from, to) =>
      supabase.from('drivers').select('*').is('archived_at', null).order('id').range(from, to),
    ),
    fetchAll<Document>((from, to) =>
      supabase
        .from('documents')
        .select('*')
        .is('archived_at', null)
        .not('expiry_date', 'is', null)
        .in('doc_type', CALENDAR_DOC_TYPES)
        .order('id')
        .range(from, to),
    ),
    fetchAll<Visit>((from, to) =>
      supabase.from('visits').select('*').is('archived_at', null).order('id').range(from, to),
    ),
  ])

  return { clients, events: buildEvents({ clients, vehicles, drivers, documents, visits }) }
}

export function buildEvents({
  clients,
  vehicles,
  drivers,
  documents,
  visits,
  today = toISODate(new Date()),
}: {
  clients: Client[]
  vehicles: Vehicle[]
  drivers: Driver[]
  documents: Document[]
  visits: Visit[]
  today?: string
}): CalendarEvent[] {
  const activeClients = new Set(clients.map((c) => c.id))
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  const driverById = new Map(drivers.map((d) => [d.id, d]))
  const events: CalendarEvent[] = []

  // Documents: per (parent, type) only the current document (latest expiry) carries
  // carries the due date. Cadence-tracked checks (PMI, brake test, licence
  // check) also put every record on the day it was performed, and any cycle
  // with no record becomes a missing event. Other types show a superseded
  // document as done on its own expiry date.
  const groups = new Map<string, Document[]>()
  for (const doc of documents) {
    if (!doc.expiry_date || !activeClients.has(doc.client_id)) continue
    const key = `${doc.parent_id}:${doc.doc_type}`
    const list = groups.get(key)
    if (list) list.push(doc)
    else groups.set(key, [doc])
  }

  for (const group of groups.values()) {
    const sample = group[0]

    let subject: string | null = null
    let href = `/clients/${sample.client_id}`
    if (sample.parent_type === 'vehicle') {
      const vehicle = vehicleById.get(sample.parent_id)
      if (!vehicle) continue
      subject = vehicle.registration
      href = `/clients/${sample.client_id}/vehicles/${vehicle.id}`
    } else if (sample.parent_type === 'driver') {
      const driver = driverById.get(sample.parent_id)
      if (!driver) continue
      subject = driver.name
      href = `/clients/${sample.client_id}/drivers/${driver.id}`
    } else {
      continue
    }

    const current = group.reduce((a, b) => (isMoreCurrent(b, a) ? b : a))
    const tracksPerformed = isPerformedDocType(sample.doc_type)
    const performed: string[] = []

    for (const doc of group) {
      const base = {
        clientId: doc.client_id,
        title: doc.doc_type,
        subject,
        href,
      }
      const done = tracksPerformed ? performedDateOf(doc) : null
      if (done && done <= today) {
        performed.push(done)
        events.push({ ...base, id: `done-${doc.id}`, date: done, status: 'done' })
      }
      if (doc.id === current.id) {
        events.push({
          ...base,
          id: `doc-${doc.id}`,
          date: doc.expiry_date!,
          status: statusFor(doc.expiry_date!, today, doc.reminder_days_before),
        })
      } else if (!tracksPerformed) {
        events.push({ ...base, id: `doc-${doc.id}`, date: doc.expiry_date!, status: 'done' })
      }
    }

    const cadence = DOC_CADENCE_DAYS[sample.doc_type]
    if (tracksPerformed && cadence) {
      for (const date of missingDates(performed, cadence, today)) {
        events.push({
          id: `missing-${sample.parent_id}-${sample.doc_type}-${date}`,
          date,
          clientId: sample.client_id,
          title: sample.doc_type,
          subject,
          status: 'missing',
          href,
        })
      }
    }
  }

  // Visits: every logged visit is a done event; the next one is due a year
  // after the latest (or a year after the client was added, if never visited).
  const visitsByClient = new Map<string, Visit[]>()
  for (const visit of visits) {
    if (!activeClients.has(visit.client_id)) continue
    const list = visitsByClient.get(visit.client_id) ?? []
    list.push(visit)
    visitsByClient.set(visit.client_id, list)
  }

  for (const client of clients) {
    const clientVisits = visitsByClient.get(client.id) ?? []
    let latest: string | null = null
    for (const visit of clientVisits) {
      events.push({
        id: `visit-${visit.id}`,
        date: visit.date,
        clientId: client.id,
        title: 'Visit',
        subject: null,
        status: 'done',
        href: `/clients/${client.id}/visits/${visit.id}`,
      })
      if (!latest || visit.date > latest) latest = visit.date
    }

    const base = latest ?? toISODate(new Date(client.created_at))
    const due = addDaysISO(base, VISIT_CADENCE_DAYS)
    events.push({
      id: `visit-due-${client.id}`,
      date: due,
      clientId: client.id,
      title: 'Visit due',
      subject: null,
      status: statusFor(due, today, VISIT_WARNING_DAYS),
      href: `/clients/${client.id}`,
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
