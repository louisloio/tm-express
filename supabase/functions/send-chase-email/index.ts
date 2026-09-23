// Sends a chase email via the calling user's own connected SMTP mailbox —
// From is the mailbox's literal address, not a Reply-To proxy through a
// shared sender (see supabase/009_mailboxes.sql and save-mailbox for how
// mailboxes are connected and their credentials stored).
//
// Deploy: supabase functions deploy send-chase-email

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { assertPublicHost } from '../_shared/ssrf_guard.ts'
import { decryptSecret } from '../_shared/mailbox_crypto.ts'
import { sendViaSmtp } from '../_shared/smtp.ts'
import { corsHeaders, json } from '../_shared/http.ts'

interface Payload {
  mailboxId?: string
  to?: string[]
  subject?: string
  body?: string
  html?: string
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

  const { mailboxId, to, subject, body, html } = payload

  if (!mailboxId || typeof mailboxId !== 'string')
    return json({ error: '"mailboxId" is required.' }, 400)
  if (!Array.isArray(to) || to.length === 0 || to.some((t) => typeof t !== 'string')) {
    return json({ error: '"to" must be a non-empty array of email addresses.' }, 400)
  }
  if (typeof subject !== 'string' || !subject.trim())
    return json({ error: '"subject" is required.' }, 400)
  if (typeof body !== 'string' || !body.trim()) return json({ error: '"body" is required.' }, 400)

  const admin = serviceClient()

  const { data: mailbox } = await admin
    .from('mailboxes')
    .select('id, email, smtp_host, smtp_port, smtp_secure, smtp_username')
    .eq('id', mailboxId)
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle()
  if (!mailbox) return json({ error: 'Mailbox not found.' }, 404)

  const { data: secret } = await admin
    .from('mailbox_secrets')
    .select('encrypted_password, iv')
    .eq('mailbox_id', mailbox.id)
    .maybeSingle()
  if (!secret) return json({ error: 'Mailbox has no stored credentials.' }, 500)

  try {
    await assertPublicHost(mailbox.smtp_host)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid host.' }, 400)
  }

  try {
    const password = await decryptSecret(secret.encrypted_password, secret.iv)
    await sendViaSmtp(
      {
        hostname: mailbox.smtp_host,
        port: mailbox.smtp_port,
        secure: mailbox.smtp_secure,
        username: mailbox.smtp_username,
        password,
      },
      {
        from: mailbox.email,
        to,
        // BCC the sender's own mailbox — a raw SMTP submission doesn't get
        // auto-saved to the sender's Sent folder the way composing through
        // webmail does, so this is the TM's only record of what was sent.
        bcc: [mailbox.email],
        subject,
        content: body,
        html: typeof html === 'string' ? html : undefined,
      },
    )
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not send this email.' }, 502)
  }

  return json({ success: true })
})
