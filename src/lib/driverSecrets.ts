import { supabase } from './supabase'

/**
 * A driver's National Insurance number never lives on the `drivers` row —
 * see supabase/011_driver_fields.sql — so it's only ever read or written
 * through these two Edge Functions, each of which re-checks the driver
 * belongs to the calling user before touching driver_secrets.
 */

/** Fetches and decrypts the NI number for `driverId`, or null if none is on file. Call this only when the owning user explicitly asks to reveal it (DriverPage) — never eagerly, and never from a list view. */
export async function fetchDriverNi(driverId: string): Promise<{
  niNumber: string | null
  error: string | null
}> {
  const { data, error } = await supabase.functions.invoke('get-driver-ni', {
    body: { driverId },
  })
  if (error) return { niNumber: null, error: error.message }
  if (data?.error) return { niNumber: null, error: data.error as string }
  return { niNumber: (data?.niNumber as string | null) ?? null, error: null }
}

/** Encrypts and stores the NI number for `driverId`. Pass an empty string to clear it. */
export async function saveDriverNi(
  driverId: string,
  niNumber: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('save-driver-ni', {
    body: { driverId, niNumber },
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error as string }
  return { error: null }
}
