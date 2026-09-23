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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
          .map((l) => `<li style="margin-bottom:6px;">${escapeHtml(l.slice(2))}</li>`)
          .join('')
        return `<ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>`
      }
      return `<p style="margin:0 0 16px;line-height:1.5;">${lines.map(escapeHtml).join('<br>')}</p>`
    })
    .join('')

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:18px 24px;border-radius:10px 10px 0 0;">
    <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.3px;">TM Express</span>
  </div>
  <div style="border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:24px;color:#1a1a1a;font-size:15px;">
    ${blocksHtml}
  </div>
  <p style="margin:16px 4px 0;color:#8a8a8a;font-size:12px;">Sent via TM Express compliance tracking.</p>
</div>`
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
