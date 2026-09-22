// Imports DVSA's public Vehicle Operator Licensing register into the
// vol_operators table, so the Add Client dialog can search it locally.
//
// DVSA doesn't expose a live queryable API for this data — the interactive
// search at vehicle-operator-licensing.service.gov.uk is a bot-gated,
// session-based GOV.UK form, not something safe to script against. Instead
// DVSA publishes the full register as region CSVs under the Open Government
// Licence, refreshed every Sunday: https://www.data.gov.uk/dataset/2a67d1ee-8f1b-43a3-8bc6-e8772d162a3c
//
// Run: node --env-file=.env.local scripts/import-vol-register.mjs
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role bypasses
// RLS — this table has no public write policy).

import { createClient } from '@supabase/supabase-js'

const REGIONS = [
  'West of England',
  'West Midlands',
  'Wales',
  'London and the South East of England',
  'Scotland',
  'North West of England',
  'North East of England',
  'East of England',
]

const BASE_URL =
  'https://content.mgmt.dvsacloud.uk/olcs.app.prod.dvsa.aws/data-gov-uk-export/OLBSLicenceReport_'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY in env.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Minimal RFC4180 CSV parser — handles quoted fields, embedded commas, and
// escaped "" quotes, which the DVSA export uses throughout (addresses).
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (c === '\r') {
      // skip, \n handles the row break
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

function toDate(value) {
  return value && value.trim() ? value.trim() : null
}

async function importRegion(region) {
  const url = `${BASE_URL}${encodeURIComponent(region)}.csv`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  ✗ ${region}: HTTP ${res.status}`)
    return 0
  }
  const text = await res.text()
  const rows = parseCsv(text)
  const [header, ...dataRows] = rows
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]))

  // DVSA's export repeats a full row per licence (verified: identical content,
  // not distinct history) — as much as two-thirds of some regional files are
  // duplicate rows. Dedupe by licence_number (last occurrence wins) before
  // upserting, otherwise a single INSERT batch that contains the same
  // licence_number twice fails outright ("ON CONFLICT DO UPDATE command
  // cannot affect row a second time").
  const byLicence = new Map()
  for (const r of dataRows) {
    if (r.length <= 1 || !r[col.LicenceNumber]?.trim()) continue
    byLicence.set(r[col.LicenceNumber].trim(), {
      licence_number: r[col.LicenceNumber].trim(),
      geographic_region: r[col.GeographicRegion] || null,
      licence_type: r[col.LicenceType] || null,
      operator_name: r[col.OperatorName]?.trim() || '(unnamed operator)',
      operator_type: r[col.OperatorType] || null,
      correspondence_address: r[col.CorrespondenceAddress]?.trim().replace(/\s+/g, ' ') || null,
      oc_address: r[col.OCAddress]?.trim().replace(/\s+/g, ' ') || null,
      transport_manager: r[col.TransportManager] || null,
      vehicles_authorised: toInt(r[col.NumberOfVehiclesAuthorised]),
      trailers_authorised: toInt(r[col.NumberOfTrailersAuthorised]),
      vehicles_specified: toInt(r[col.VehiclesSpecified]),
      trailers_specified: toInt(r[col.TrailersSpecified]),
      director_or_partner: r[col.DirectorOrPartner] || null,
      licence_status: r[col.LicenceStatus] || null,
      continuation_date: toDate(r[col.ContinuationDate]),
      company_reg_number: r[col.CompanyRegNumber] || null,
      updated_at: new Date().toISOString(),
    })
  }
  const records = [...byLicence.values()]

  const BATCH_SIZE = 500
  let succeeded = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('vol_operators').upsert(batch, {
      onConflict: 'licence_number',
    })
    if (error) {
      console.error(`  ✗ ${region} batch ${i}: ${error.message}`)
    } else {
      succeeded += batch.length
    }
  }

  console.log(`  ✓ ${region}: ${succeeded}/${records.length} operators (${dataRows.length} raw rows)`)
  return succeeded
}

async function main() {
  console.log('Importing DVSA operator register…')
  let total = 0
  for (const region of REGIONS) {
    total += await importRegion(region)
  }
  console.log(`Done. ${total} operators imported across ${REGIONS.length} regions.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
