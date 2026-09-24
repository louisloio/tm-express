// Sends a chase email via the Gmail API or Microsoft Graph API, using an
// already-fresh OAuth access token (see oauth_providers.ts for how that's
// obtained). Structurally parallel to _shared/smtp.ts's sendViaSmtp, for
// the two OAuth-connected provider cases.

export interface OAuthMessage {
  from: string
  to: string[]
  bcc?: string[]
  subject: string
  content: string
  html?: string
}

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildRawMime(message: OAuthMessage): string {
  const boundary = `tmex_${crypto.randomUUID().replace(/-/g, '')}`
  const headers = [
    `From: ${message.from}`,
    `To: ${message.to.join(', ')}`,
    ...(message.bcc && message.bcc.length ? [`Bcc: ${message.bcc.join(', ')}`] : []),
    `Subject: ${message.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n')

  const parts = [
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    message.content,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    message.html ?? message.content,
    `--${boundary}--`,
    '',
  ].join('\r\n')

  return headers + parts
}

export async function sendViaGmail(accessToken: string, message: OAuthMessage): Promise<void> {
  const raw = b64urlEncode(buildRawMime(message))
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? `Gmail send failed (${res.status}).`)
  }
}

export async function sendViaMicrosoftGraph(
  accessToken: string,
  message: OAuthMessage,
): Promise<void> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: 'HTML', content: message.html ?? message.content },
        toRecipients: message.to.map((address) => ({ emailAddress: { address } })),
        // No bccRecipients here — unlike SMTP/Gmail, Graph's
        // saveToSentItems already gives the sender a copy in their own
        // Sent folder, so a self-Bcc would just be a duplicate.
      },
      saveToSentItems: true,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? `Microsoft Graph send failed (${res.status}).`)
  }
}
