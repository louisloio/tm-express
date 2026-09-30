// Decrypts a driver's National Insurance number for display — only ever
// called from DriverPage itself (see src/pages/DriverPage.tsx), never from
// a list view, and only after the owning user explicitly asks to reveal
// it (see src/lib/driverSecrets.ts).
//
// Deploy: supabase functions deploy get-driver-ni

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/mailbox_crypto.ts'
import { corsHeaders, json } from '../_shared/http.ts'

interface Payload {
  driverId?: string
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

  const { driverId } = payload
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

  const { data: secret } = await admin
    .from('driver_secrets')
    .select('encrypted_ni, iv')
    .eq('driver_id', driverId)
    .maybeSingle()

  if (!secret) return json({ niNumber: null })

  const niNumber = await decryptSecret(secret.encrypted_ni, secret.iv)
  return json({ niNumber })
})
