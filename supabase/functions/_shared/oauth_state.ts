// Signs/verifies the short-lived `state` token used across the OAuth
// connect flow (oauth-authorize -> oauth-*-callback). HMAC-SHA256 over a
// JSON payload, keyed by OAUTH_STATE_SECRET (random 32 bytes, base64, set
// via `supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -base64 32)`
// — never touches chat). Stateless: no DB round-trip needed to mint or
// check it. The embedded `nonce` is separately compared against an
// HttpOnly cookie in the callback (double-submit) to stop a signed state
// being forwarded to someone else's browser and having their mailbox
// attached to the wrong account.

export interface OAuthStatePayload {
  userId: string
  provider: 'google' | 'microsoft'
  origin: string
  mailboxId?: string
  nonce: string
  exp: number
}

const STATE_TTL_MS = 10 * 60 * 1000

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('OAUTH_STATE_SECRET')
  if (!secret) throw new Error('OAUTH_STATE_SECRET is not configured on this function.')
  const raw = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export function randomNonce(): string {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(18)))
}

export async function signState(
  payload: Omit<OAuthStatePayload, 'exp'>,
): Promise<string> {
  const key = await getKey()
  const full: OAuthStatePayload = { ...payload, exp: Date.now() + STATE_TTL_MS }
  const json = JSON.stringify(full)
  const bodyB64 = b64urlEncode(new TextEncoder().encode(json))
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyB64))
  return `${bodyB64}.${b64urlEncode(new Uint8Array(sig))}`
}

export async function verifyState(token: string): Promise<OAuthStatePayload> {
  const [bodyB64, sigB64] = token.split('.')
  if (!bodyB64 || !sigB64) throw new Error('Malformed state.')
  const key = await getKey()
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(sigB64),
    new TextEncoder().encode(bodyB64),
  )
  if (!valid) throw new Error('Invalid state signature.')
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(bodyB64))) as OAuthStatePayload
  if (Date.now() > payload.exp) throw new Error('This connection attempt expired — try again.')
  return payload
}
