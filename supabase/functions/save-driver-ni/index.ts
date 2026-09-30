// Encrypts and stores (or clears) a driver's National Insurance number.
//
// Deploy: supabase functions deploy save-driver-ni
//
// NI number never travels through an RLS-visible table — driver_secrets
// has RLS enabled with zero policies for anon/authenticated (see
// supabase/011_driver_fields.sql), so only this function's service-role
// client can touch it. Ownership is checked by hand: the driver must
// belong to a client owned by the calling user, resolved from the
// request's own Authorization header (never trust a driverId's owner
// claimed in the body).

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { encryptSecret } from '../_shared/mailbox_crypto.ts'
import { corsHeaders, json } from '../_shared/http.ts'

interface Payload {
  driverId?: string
  /** Blank/omitted clears any NI number already on file for this driver. */
  niNumber?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { userId } = await resolveUser(req)
  if (!userId) return json({ error: 'Not authenticated.' }, 401)

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const { driverId, niNumber } = payload
  if (!driverId || typeof driverId !== 'string') {
    return json({ error: '"driverId" is required.' }, 400)
  }

  const admin = serviceClient()

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, clients!inner(user_id)')
    .eq('id', driverId)
    .maybeSingle()
  const owner = (driver as { clients?: { user_id?: string } } | null)?.clients?.user_id
  if (driverError || !driver || owner !== userId) {
    return json({ error: 'Driver not found.' }, 404)
  }

  const trimmed = niNumber?.trim() ?? ''

  if (!trimmed) {
    const { error } = await admin.from('driver_secrets').delete().eq('driver_id', driverId)
    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  const { ciphertext, iv } = await encryptSecret(trimmed.toUpperCase())
  const { error } = await admin
    .from('driver_secrets')
    .upsert({ driver_id: driverId, encrypted_ni: ciphertext, iv, updated_at: new Date().toISOString() })
  if (error) return json({ error: error.message }, 500)

  return json({ success: true })
})
