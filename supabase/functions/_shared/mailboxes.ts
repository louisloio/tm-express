import { encryptSecret } from './mailbox_crypto.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface SmtpFields {
  host: string
  port: number
  secure: boolean
  username: string
}

export interface UpsertMailboxParams {
  userId: string
  mailboxId?: string
  email: string
  label?: string | null
  provider: 'smtp' | 'google' | 'microsoft'
  smtp?: SmtpFields
  /** The plaintext secret to store — an SMTP password or an OAuth refresh
   * token, depending on provider. Always written: callers that want to
   * keep an existing secret unchanged should resolve and pass that value
   * themselves first (see save-mailbox's "blank password = keep current"
   * handling). */
  secretPlain: string
}

/** Creates or updates a mailbox + its encrypted secret, scoped to
 * userId, reusing the same "first mailbox becomes default" rule and
 * ownership checks everywhere a mailbox gets connected (manual SMTP save,
 * OAuth connect, OAuth reconnect). */
export async function upsertMailbox(
  // deno-lint-ignore no-explicit-any
  admin: SupabaseClient<any>,
  params: UpsertMailboxParams,
): Promise<{ id: string } | { error: string; status: number }> {
  const { userId, mailboxId, email, label, provider, smtp, secretPlain } = params
  const now = new Date().toISOString()

  const smtpFields = smtp
    ? {
        smtp_host: smtp.host,
        smtp_port: smtp.port,
        smtp_secure: smtp.secure,
        smtp_username: smtp.username,
      }
    : { smtp_host: null, smtp_port: null, smtp_secure: true, smtp_username: null }

  if (mailboxId) {
    const { data: owned } = await admin
      .from('mailboxes')
      .select('id')
      .eq('id', mailboxId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!owned) return { error: 'Mailbox not found.', status: 404 }

    const { error: updateError } = await admin
      .from('mailboxes')
      .update({
        email,
        label: label ?? null,
        provider,
        ...smtpFields,
        verified_at: now,
        needs_reauth: false,
      })
      .eq('id', mailboxId)
    if (updateError) return { error: updateError.message, status: 500 }

    const { ciphertext, iv } = await encryptSecret(secretPlain)
    const { error: secretError } = await admin
      .from('mailbox_secrets')
      .update({ encrypted_secret: ciphertext, iv })
      .eq('mailbox_id', mailboxId)
    if (secretError) return { error: secretError.message, status: 500 }

    return { id: mailboxId }
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
      provider,
      ...smtpFields,
      is_default: isFirstMailbox,
      verified_at: now,
    })
    .select('id')
    .single()
  if (insertError || !inserted)
    return { error: insertError?.message ?? 'Could not save mailbox.', status: 500 }

  const { ciphertext, iv } = await encryptSecret(secretPlain)
  const { error: secretError } = await admin
    .from('mailbox_secrets')
    .insert({ mailbox_id: inserted.id, encrypted_secret: ciphertext, iv })
  if (secretError) {
    // Don't leave an orphaned mailbox row with no secret behind it.
    await admin.from('mailboxes').delete().eq('id', inserted.id)
    return { error: secretError.message, status: 500 }
  }

  return { id: inserted.id }
}
