// Seeds the app with the placeholder data from tm-express-figma-seed-data.md,
// so the first real account has data consistent with the Figma prototype.
//
// Signs in as the target user (their real, already-signed-up account) and
// inserts through the anon-key client, so every row is created exactly the
// way the app would create it — same RLS path, same auth.uid() ownership.
// No service role key needed for this script.
//
// Run: node --env-file=.env.local scripts/seed.mjs
// Requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SEED_USER_EMAIL,
// SEED_USER_PASSWORD.
//
// NOTE: todos are intentionally NOT seeded here. Several of the seed todo
// items (e.g. "CF18 LMN: PMI missing") describe a document that was never
// uploaded — there's no document row for a todo to reference, and the app
// doesn't yet have logic for detecting "expected but missing" documents
// (todo generation is explicitly out of scope for this round). Seed todos
// once that mechanism is designed, rather than guessing at it here.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SEED_USER_EMAIL
const password = process.env.SEED_USER_PASSWORD

if (!supabaseUrl || !anonKey || !email || !password) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SEED_USER_EMAIL / SEED_USER_PASSWORD in env.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

async function insertOne(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  return data
}

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw new Error(`Sign-in failed: ${authError.message}`)
  console.log(`Signed in as ${email}`)

  const clients = {}

  clients.acme = await insertOne('clients', {
    company_name: 'Acme Haulage Ltd',
    ol_number: 'OF1234567',
    onboarding_status: 'Approved',
    address: '14 Bridgewater Road, Leeds, LS9 2AA',
    operating_centre: 'Whitehall Industrial Park, Leeds, LS12 6EF',
  })
  await insertOne('client_contacts', { client_id: clients.acme.id, email: 'ops@acmehaulage.co.uk' })

  clients.coastal = await insertOne('clients', {
    company_name: 'Coastal Freight Solutions',
    ol_number: 'OF7654321',
    onboarding_status: 'Approved',
    address: '22 Harbour View, Plymouth, PL1 3DE',
    operating_centre: 'Estover Trading Estate, Plymouth, PL6 7PY',
  })
  await insertOne('client_contacts', {
    client_id: clients.coastal.id,
    email: 'admin@coastalfreight.co.uk',
  })

  clients.meridian = await insertOne('clients', {
    company_name: 'Meridian Logistics Group',
    ol_number: null,
    onboarding_status: 'In Progress',
    address: '7 Meridian House, Birmingham, B4 6AT',
    operating_centre: 'Aston Cross Business Park, Birmingham, B6 5RQ',
  })
  await insertOne('client_contacts', {
    client_id: clients.meridian.id,
    email: 'contact@meridianlogistics.co.uk',
  })

  clients.northbridge = await insertOne('clients', {
    company_name: 'Northbridge Transport',
    ol_number: 'OF2223344',
    onboarding_status: 'Approved',
    address: '3 Northbridge Way, Manchester, M17 1FQ',
    operating_centre: 'Trafford Park Depot, Manchester, M17 1EH',
  })
  await insertOne('client_contacts', {
    client_id: clients.northbridge.id,
    email: 'fleet@northbridgetransport.co.uk',
  })

  console.log('Clients + contacts created.')

  const vehicles = {}
  vehicles['AB19 CDE'] = await insertOne('vehicles', {
    client_id: clients.acme.id,
    registration: 'AB19 CDE',
  })
  for (const reg of ['CF15 UVW', 'CF17 RST', 'CF18 LMN']) {
    vehicles[reg] = await insertOne('vehicles', { client_id: clients.coastal.id, registration: reg })
  }
  console.log('Vehicles created.')

  const drivers = {}
  for (const name of ['Jamie Fox', 'Priya Nair', 'Morgan Lee', 'Taylor Reed']) {
    drivers[name] = await insertOne('drivers', { client_id: clients.coastal.id, name })
  }
  console.log('Drivers created.')

  await insertOne('visits', {
    client_id: clients.coastal.id,
    date: '2026-08-18',
    notes: 'Routine compliance visit.',
  })
  console.log('Visit created.')

  const documents = [
    { vehicle: 'AB19 CDE', doc_type: 'MOT', expiry_date: '2026-08-28', reminder_days_before: 14 },
    { vehicle: 'CF15 UVW', doc_type: 'Brake test', expiry_date: '2026-09-10', reminder_days_before: 7 },
    { vehicle: 'CF15 UVW', doc_type: 'VED', expiry_date: '2026-09-05', reminder_days_before: 14 },
    { vehicle: 'CF17 RST', doc_type: 'Brake test', expiry_date: '2026-09-15', reminder_days_before: 7 },
    { vehicle: 'CF15 UVW', doc_type: 'MOT', expiry_date: '2026-09-01', reminder_days_before: 14 },
    { vehicle: 'CF15 UVW', doc_type: 'PMI', expiry_date: '2026-09-18', reminder_days_before: 7 },
    { vehicle: 'CF15 UVW', doc_type: 'Insurance', expiry_date: '2026-09-08', reminder_days_before: 14 },
  ]
  for (const d of documents) {
    const vehicle = vehicles[d.vehicle]
    await insertOne('documents', {
      client_id: vehicle.client_id,
      parent_type: 'vehicle',
      parent_id: vehicle.id,
      doc_type: d.doc_type,
      expiry_date: d.expiry_date,
      reminder_days_before: d.reminder_days_before,
    })
  }

  const driverDocuments = [
    { driver: 'Priya Nair', doc_type: 'Licence check', expiry_date: '2026-08-30', reminder_days_before: 30 },
    { driver: 'Morgan Lee', doc_type: 'Licence check', expiry_date: '2026-09-12', reminder_days_before: 30 },
    { driver: 'Morgan Lee', doc_type: 'CPC', expiry_date: '2026-08-20', reminder_days_before: 60 },
  ]
  for (const d of driverDocuments) {
    const driver = drivers[d.driver]
    await insertOne('documents', {
      client_id: driver.client_id,
      parent_type: 'driver',
      parent_id: driver.id,
      doc_type: d.doc_type,
      expiry_date: d.expiry_date,
      reminder_days_before: d.reminder_days_before,
    })
  }
  console.log('Documents created (overdue set only — missing-document items have no row, by design).')

  await insertOne('infringements', {
    client_id: clients.coastal.id,
    category: 'Driver Hours & Tachograph',
    type: 'Insufficient Weekly Rest',
    driver_id: drivers['Priya Nair'].id,
    date: '2026-09-02',
    resolved: false,
  })
  await insertOne('infringements', {
    client_id: clients.coastal.id,
    category: 'Vehicle Roadworthiness & Maintenance',
    type: 'Unresolved Safety Defect',
    vehicle_id: vehicles['CF17 RST'].id,
    date: '2026-09-10',
    resolved: false,
  })
  await insertOne('infringements', {
    client_id: clients.acme.id,
    category: 'Operational Loading & Weight',
    type: 'Axle Weight Overload',
    vehicle_id: vehicles['AB19 CDE'].id,
    date: '2026-09-05',
    resolved: true,
  })
  await insertOne('infringements', {
    client_id: clients.northbridge.id,
    category: 'Licence & Operator Infrastructure',
    type: 'Overdue Driver Licence Check',
    date: '2026-08-15',
    resolved: false,
  })
  console.log('Infringements created.')

  console.log('Seed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
