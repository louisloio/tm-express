import { supabase } from './supabase'
import type { EmailChaseScope, Todo } from '../types/database'

export function buildSingleTodoTemplate(todo: Todo, clientName: string) {
  const subject = `[TM Express] Action needed: ${todo.description}`
  const body = `Dear ${clientName},

Our records show the following outstanding compliance item requires your attention:

${todo.description}

Please action this as soon as possible and let us know once it's resolved.

Thanks,
Transport Manager`
  return { subject, body }
}

export function buildAllOutstandingTemplate(todos: Todo[], clientName: string) {
  const subject = `[TM Express] ${todos.length} outstanding compliance item${
    todos.length === 1 ? '' : 's'
  } for ${clientName}`
  const items = todos.map((t) => `- ${t.description}`).join('\n')
  const body = `Dear ${clientName},

Our records show the following outstanding compliance items require your attention:

${items}

Please action these as soon as possible and let us know once resolved.

Thanks,
Transport Manager`
  return { subject, body }
}

/** Email clients can't render SVG, so the logo is a PNG served from the deployed app. */
const EMAIL_LOGO_URL = `${
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ??
  'https://tm-express-lyart.vercel.app'
}/email-logo.png`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Turns the plain-text body the user edits in the chase modal into a styled
 * HTML version — paragraphs, and "- item" lines rendered as a real list —
 * so it always stays in sync with whatever they've typed, no separate
 * rich-text editor needed. */
export function renderChaseEmailHtml(bodyText: string): string {
  const blocks = bodyText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  const blocksHtml = blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const isList = lines.length > 0 && lines.every((l) => l.startsWith('- '))
      if (isList) {
        const items = lines
          .map((l) => `<li style="margin-bottom:8px;">${escapeHtml(l.slice(2))}</li>`)
          .join('')
        return `<ul style="margin:0 0 16px;padding-left:20px;color:#1c1c1e;">${items}</ul>`
      }
      return `<p style="margin:0 0 16px;line-height:1.5;color:#1c1c1e;">${lines.map(escapeHtml).join('<br>')}</p>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f2f2f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f7;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="height:4px;line-height:4px;font-size:0;border-radius:14px 14px 0 0;background:#0a456f;background-image:linear-gradient(90deg,#8cc3ee,#0a456f);">&nbsp;</td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:24px 28px 8px;">
            <img src="${EMAIL_LOGO_URL}" alt="TM Express" width="120" height="36" style="display:block;border:0;outline:none;height:36px;width:120px;">
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:16px 28px 12px;color:#1c1c1e;font-size:16px;line-height:1.5;">
            ${blocksHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:0 0 14px 14px;padding:0 28px 24px;">
            <div style="border-top:1px solid #e5e5ea;padding-top:16px;color:#8e8e93;font-size:12px;line-height:1.4;">
              Sent via <span style="color:#0a456f;font-weight:600;">TM Express</span> compliance tracking.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Calls the send-chase-email Edge Function, which sends via the given mailbox's own SMTP server. */
export async function sendChaseEmail(params: {
  mailboxId: string
  to: string[]
  subject: string
  body: string
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-chase-email', {
    body: { ...params, html: renderChaseEmailHtml(params.body) },
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error as string }
  return { error: null }
}

/** Logs the chase (matching the EmailChase data model) — the email_chases_apply_cooling DB trigger reads this insert to start the 3-day cooldown. Call only after sendChaseEmail succeeds. */
export async function recordChase(params: {
  clientId: string
  scope: EmailChaseScope
  todoId?: string
  recipients: string[]
  subject: string
  body: string
  fromEmail: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('email_chases').insert({
    client_id: params.clientId,
    scope: params.scope,
    todo_id: params.todoId ?? null,
    recipients: params.recipients,
    subject: params.subject,
    body: params.body,
    from_email: params.fromEmail,
  })
  return { error: error?.message ?? null }
}
