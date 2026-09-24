// Sends a chase email via the calling user's own connected mailbox — SMTP,
// Gmail, or Microsoft — so From is always the mailbox's literal address,
// never a Reply-To proxy through a shared sender. See
// supabase/009_mailboxes.sql / supabase/010_mailbox_oauth.sql and
// save-mailbox / oauth-*-callback for how mailboxes get connected.
//
// Deploy: supabase functions deploy send-chase-email

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { assertPublicHost } from '../_shared/ssrf_guard.ts'
import { encryptSecret, decryptSecret } from '../_shared/mailbox_crypto.ts'
import { sendViaSmtp } from '../_shared/smtp.ts'
import { sendViaGmail, sendViaMicrosoftGraph } from '../_shared/oauth_send.ts'
import { OAuthReauthRequiredError, refreshAccessToken } from '../_shared/oauth_providers.ts'
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
    .select('id, email, provider, smtp_host, smtp_port, smtp_secure, smtp_username')
    .eq('id', mailboxId)
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle()
  if (!mailbox) return json({ error: 'Mailbox not found.' }, 404)

  const { data: secret } = await admin
    .from('mailbox_secrets')
    .select('encrypted_secret, iv')
    .eq('mailbox_id', mailbox.id)
    .maybeSingle()
  if (!secret) return json({ error: 'Mailbox has no stored credentials.' }, 500)

  const message = {
    from: mailbox.email,
    to,
    bcc: [mailbox.email],
    subject,
    content: body,
    html: typeof html === 'string' ? html : undefined,
  }

  if (mailbox.provider === 'google' || mailbox.provider === 'microsoft') {
    try {
      const refreshToken = await decryptSecret(secret.encrypted_secret, secret.iv)
      const refreshed = await refreshAccessToken(mailbox.provider, refreshToken)

      // Microsoft commonly rotates the refresh token on use; Google
      // usually doesn't return a new one — only persist when present.
      if (refreshed.refreshToken && refreshed.refreshToken !== refreshToken) {
        const { ciphertext, iv } = await encryptSecret(refreshed.refreshToken)
        await admin
          .from('mailbox_secrets')
          .update({ encrypted_secret: ciphertext, iv })
          .eq('mailbox_id', mailbox.id)
      }

      if (mailbox.provider === 'google') {
        await sendViaGmail(refreshed.accessToken, message)
      } else {
        await sendViaMicrosoftGraph(refreshed.accessToken, message)
      }
    } catch (err) {
      if (err instanceof OAuthReauthRequiredError) {
        await admin.from('mailboxes').update({ needs_reauth: true }).eq('id', mailbox.id)
        return json(
          {
            error: `This ${mailbox.provider === 'google' ? 'Gmail' : 'Microsoft'} connection expired — reconnect it in your profile.`,
          },
          409,
        )
      }
      return json({ error: err instanceof Error ? err.message : 'Could not send this email.' }, 502)
    }
    return json({ success: true })
  }

  // SMTP
  try {
    await assertPublicHost(mailbox.smtp_host!)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid host.' }, 400)
  }

  try {
    const password = await decryptSecret(secret.encrypted_secret, secret.iv)
    await sendViaSmtp(
      {
        hostname: mailbox.smtp_host!,
        port: mailbox.smtp_port!,
        secure: mailbox.smtp_secure,
        username: mailbox.smtp_username!,
        password,
      },
      message,
    )
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not send this email.' }, 502)
  }

  return json({ success: true })
})
