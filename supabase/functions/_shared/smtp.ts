import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const CONNECT_TIMEOUT_MS = 10_000

export interface SmtpConfig {
  hostname: string
  port: number
  secure: boolean
  username: string
  password: string
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out ${label} after ${ms / 1000}s.`)), ms),
    ),
  ])
}

/** Maps low-level connect/auth failures to messages a TM can act on. */
function friendlyError(config: SmtpConfig, err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()

  if (lower.includes('timed out')) {
    return new Error(`Couldn't reach ${config.hostname}:${config.port} — check the host and port.`)
  }
  if (lower.includes('auth') || lower.includes('535') || lower.includes('credentials')) {
    const gmailHint = config.hostname.toLowerCase().includes('gmail')
      ? ' Gmail rejects your normal login password over SMTP — use an "app password" from your Google Account security settings instead.'
      : ''
    return new Error(`Authentication failed — check the username and password.${gmailHint}`)
  }
  return new Error(`Couldn't send via ${config.hostname}: ${raw}`)
}

export async function sendViaSmtp(
  config: SmtpConfig,
  message: {
    from: string
    to: string[]
    bcc?: string[]
    subject: string
    content: string
    html?: string
  },
): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: config.hostname,
      port: config.port,
      tls: config.secure,
      auth: { username: config.username, password: config.password },
    },
  })

  try {
    await withTimeout(
      client.send({
        from: message.from,
        to: message.to,
        bcc: message.bcc,
        subject: message.subject,
        content: message.content,
        html: message.html,
      }),
      CONNECT_TIMEOUT_MS,
      'sending',
    )
  } catch (err) {
    throw friendlyError(config, err)
  } finally {
    try {
      await withTimeout(client.close(), 3_000, 'closing connection')
    } catch {
      // best-effort close — nothing left to do if this fails
    }
  }
}
