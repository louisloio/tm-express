import { supabase } from './supabase'
import { formatDate } from './format'
import type { EmailChaseScope, Todo } from '../types/database'

export interface InfringementDetail {
  category: string
  type: string
  date: string
  notes: string | null
  driverName: string | null
  vehicleRegistration: string | null
}

/** Loads everything worth quoting in a chase for the infringement todos among `todos`, keyed by todo id. */
export async function fetchInfringementDetails(
  todos: Todo[],
): Promise<Map<string, InfringementDetail>> {
  const result = new Map<string, InfringementDetail>()
  const withSource = todos.filter((t) => t.source_type === 'infringement' && t.source_id)
  if (withSource.length === 0) return result

  const { data: infringements } = await supabase
    .from('infringements')
    .select('*')
    .in(
      'id',
      withSource.map((t) => t.source_id as string),
    )
  const rows = infringements ?? []

  const driverIds = [...new Set(rows.map((i) => i.driver_id).filter(Boolean))] as string[]
  const vehicleIds = [...new Set(rows.map((i) => i.vehicle_id).filter(Boolean))] as string[]
  const [driversRes, vehiclesRes] = await Promise.all([
    driverIds.length
      ? supabase.from('drivers').select('id, name').in('id', driverIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    vehicleIds.length
      ? supabase.from('vehicles').select('id, registration').in('id', vehicleIds)
      : Promise.resolve({ data: [] as { id: string; registration: string }[] }),
  ])
  const drivers = new Map((driversRes.data ?? []).map((d) => [d.id, d.name]))
  const vehicles = new Map((vehiclesRes.data ?? []).map((v) => [v.id, v.registration]))

  for (const todo of withSource) {
    const inf = rows.find((i) => i.id === todo.source_id)
    if (!inf) continue
    result.set(todo.id, {
      category: inf.category,
      type: inf.type,
      date: inf.date,
      notes: inf.notes,
      driverName: inf.driver_id ? (drivers.get(inf.driver_id) ?? null) : null,
      vehicleRegistration: inf.vehicle_id ? (vehicles.get(inf.vehicle_id) ?? null) : null,
    })
  }
  return result
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

function infringementFacts(d: InfringementDetail): string[] {
  const facts = [`Category: ${d.category}`, `Type: ${d.type}`, `Date: ${formatDate(d.date)}`]
  if (d.driverName) facts.push(`Driver: ${d.driverName}`)
  if (d.vehicleRegistration) facts.push(`Vehicle: ${d.vehicleRegistration}`)
  facts.push('Status: Unresolved')
  if (d.notes?.trim()) facts.push(`Notes: ${oneLine(d.notes)}`)
  return facts
}

function infringementSummary(d: InfringementDetail): string {
  const parts = [`${d.type} (${d.category})`, formatDate(d.date)]
  if (d.driverName) parts.push(`driver ${d.driverName}`)
  if (d.vehicleRegistration) parts.push(`vehicle ${d.vehicleRegistration}`)
  const notes = d.notes?.trim() ? ` — notes: ${oneLine(d.notes)}` : ''
  return `Unresolved infringement: ${parts.join(', ')}${notes}`
}

export function buildSingleTodoTemplate(
  todo: Todo,
  clientName: string,
  infringement?: InfringementDetail,
) {
  if (todo.source_type === 'infringement' && infringement) {
    const subject = `[TM Express] Unresolved infringement: ${infringement.type}`
    const body = `Dear ${clientName},

Our records show the following infringement is still unresolved and requires your attention:

${infringementFacts(infringement).join('\n')}

Please let us know what action has been taken, or is planned, to resolve it, and send over any supporting evidence.

Thanks,
Transport Manager`
    return { subject, body }
  }

  const subject = `[TM Express] Action needed: ${todo.description}`
  const body = `Dear ${clientName},

Our records show the following outstanding compliance item requires your attention:

${todo.description}

Please action this as soon as possible and let us know once it's resolved.

Thanks,
Transport Manager`
  return { subject, body }
}

export function buildAllOutstandingTemplate(
  todos: Todo[],
  clientName: string,
  infringements?: Map<string, InfringementDetail>,
) {
  const subject = `[TM Express] ${todos.length} outstanding compliance item${
    todos.length === 1 ? '' : 's'
  } for ${clientName}`
  const items = todos
    .map((t) => {
      const detail = infringements?.get(t.id)
      return `- ${detail ? infringementSummary(detail) : t.description}`
    })
    .join('\n')
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
      const facts = lines.map((l) => /^([A-Z][A-Za-z ]{1,20}): (.+)$/.exec(l))
      if (lines.length >= 3 && facts.every(Boolean)) {
        const rows = facts
          .map(
            (m) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#6c6c70;font-size:14px;vertical-align:top;white-space:nowrap;">${escapeHtml(m![1])}</td><td style="padding:6px 0;color:#1c1c1e;font-size:15px;font-weight:500;">${escapeHtml(m![2])}</td></tr>`,
          )
          .join('')
        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;background:#f2f2f7;border-radius:10px;"><tr><td style="padding:10px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`
      }
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
