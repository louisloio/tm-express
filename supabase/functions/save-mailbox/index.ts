// Creates or updates a connected SMTP mailbox for the calling user.
//
// Deploy: supabase functions deploy save-mailbox
//
// Verifies the given SMTP credentials actually work (by sending a real
// confirmation email to the mailbox's own address — simpler and more
// conclusive than a bare AUTH-only handshake, and it doubles as visible
// proof for the user) before persisting anything. The password is
// encrypted (AES-GCM, see _shared/mailbox_crypto.ts) and stored in
// mailbox_secrets, a table with no RLS policies for anon/authenticated —
// only this function's service-role client can ever read or write it.

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { assertPublicHost } from '../_shared/ssrf_guard.ts'
import { encryptSecret, decryptSecret } from '../_shared/mailbox_crypto.ts'
import { sendViaSmtp } from '../_shared/smtp.ts'
import { corsHeaders, json } from '../_shared/http.ts'

interface Payload {
  mailboxId?: string
  email?: string
  label?: string | null
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUsername?: string
  smtpPassword?: string
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

  const { mailboxId, email, label, smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword } =
    payload

  if (!email || typeof email !== 'string') return json({ error: '"email" is required.' }, 400)
  if (!smtpHost || typeof smtpHost !== 'string')
    return json({ error: '"smtpHost" is required.' }, 400)
  if (!smtpPort || typeof smtpPort !== 'number')
    return json({ error: '"smtpPort" is required.' }, 400)
  if (!smtpUsername || typeof smtpUsername !== 'string')
    return json({ error: '"smtpUsername" is required.' }, 400)
  if (!mailboxId && !smtpPassword)
    return json({ error: '"smtpPassword" is required for a new mailbox.' }, 400)

  const admin = serviceClient()

  // Editing without a new password re-uses the existing one — both to
  // re-verify the (possibly changed) host/port/username, and because
  // "blank = keep current" is the expected edit UX for a secret field.
  let passwordToUse = smtpPassword
  if (!passwordToUse && mailboxId) {
    const { data: existing } = await admin
      .from('mailbox_secrets')
      .select('encrypted_password, iv')
      .eq('mailbox_id', mailboxId)
      .maybeSingle()
    if (!existing) return json({ error: 'Mailbox not found.' }, 404)
    passwordToUse = await decryptSecret(existing.encrypted_password, existing.iv)
  }
  if (!passwordToUse) return json({ error: '"smtpPassword" is required.' }, 400)

  try {
    await assertPublicHost(smtpHost)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid host.' }, 400)
  }

  try {
    await sendViaSmtp(
      {
        hostname: smtpHost,
        port: smtpPort,
        secure: !!smtpSecure,
        username: smtpUsername,
        password: passwordToUse,
      },
      {
        from: email,
        to: [email],
        subject: 'TM Express — mailbox connected',
        content: `This confirms ${email} is now connected to TM Express and can send compliance chase emails on your behalf.`,
      },
    )
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not verify this mailbox.' }, 502)
  }

  const now = new Date().toISOString()

  if (mailboxId) {
    const { data: owned } = await admin
      .from('mailboxes')
      .select('id')
      .eq('id', mailboxId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!owned) return json({ error: 'Mailbox not found.' }, 404)

    const { error: updateError } = await admin
      .from('mailboxes')
      .update({
        email,
        label: label ?? null,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: !!smtpSecure,
        smtp_username: smtpUsername,
        verified_at: now,
      })
      .eq('id', mailboxId)
    if (updateError) return json({ error: updateError.message }, 500)

    if (smtpPassword) {
      const { ciphertext, iv } = await encryptSecret(smtpPassword)
      const { error: secretError } = await admin
        .from('mailbox_secrets')
        .update({ encrypted_password: ciphertext, iv })
        .eq('mailbox_id', mailboxId)
      if (secretError) return json({ error: secretError.message }, 500)
    }

    return json({ success: true, id: mailboxId })
  }

  const { count } = await admin
    .from('mailboxes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('archived_at', null)
  const isFirstMailbox = (count ?? 0) === 0

  const { data: inserted, error: insertError } = await admin
    .from('mailboxes')
    .insert({
      user_id: userId,
      email,
      label: label ?? null,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_secure: !!smtpSecure,
      smtp_username: smtpUsername,
      is_default: isFirstMailbox,
      verified_at: now,
    })
    .select('id')
    .single()
  if (insertError || !inserted)
    return json({ error: insertError?.message ?? 'Could not save mailbox.' }, 500)

  const { ciphertext, iv } = await encryptSecret(passwordToUse)
  const { error: secretError } = await admin
    .from('mailbox_secrets')
    .insert({ mailbox_id: inserted.id, encrypted_password: ciphertext, iv })
  if (secretError) {
    // Don't leave an orphaned mailbox row with no secret behind it.
    await admin.from('mailboxes').delete().eq('id', inserted.id)
    return json({ error: secretError.message }, 500)
  }

  return json({ success: true, id: inserted.id })
})
