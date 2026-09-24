// Shared OAuth endpoint constants + token exchange/refresh for the Gmail
// and Microsoft mailbox-connection providers. Client secrets never leave
// this server-side code.

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'

export const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
export const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
export const MICROSOFT_GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me'
export const MICROSOFT_SCOPE = 'offline_access Mail.Send User.Read'

/** Thrown when a refresh token is rejected outright (revoked/expired) —
 * distinct from a transient network/HTTP failure, so callers can surface
 * "reconnect this mailbox" instead of a generic send error. */
export class OAuthReauthRequiredError extends Error {}

interface TokenResult {
  accessToken: string
  refreshToken?: string
}

function clientCreds(provider: 'google' | 'microsoft') {
  const id = Deno.env.get(provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'MICROSOFT_CLIENT_ID')
  const secret = Deno.env.get(
    provider === 'google' ? 'GOOGLE_CLIENT_SECRET' : 'MICROSOFT_CLIENT_SECRET',
  )
  if (!id || !secret) throw new Error(`${provider} OAuth client is not configured on this function.`)
  return { id, secret }
}

export async function exchangeCode(
  provider: 'google' | 'microsoft',
  code: string,
  redirectUri: string,
): Promise<TokenResult> {
  const { id, secret } = clientCreds(provider)
  const tokenUrl = provider === 'google' ? GOOGLE_TOKEN_URL : MICROSOFT_TOKEN_URL
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error_description ?? data?.error ?? 'Token exchange failed.')
  if (!data.refresh_token) {
    throw new Error(
      'No refresh token returned — try reconnecting and make sure to approve offline access.',
    )
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

export async function refreshAccessToken(
  provider: 'google' | 'microsoft',
  refreshToken: string,
): Promise<TokenResult> {
  const { id, secret } = clientCreds(provider)
  const tokenUrl = provider === 'google' ? GOOGLE_TOKEN_URL : MICROSOFT_TOKEN_URL
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    if (data?.error === 'invalid_grant') {
      throw new OAuthReauthRequiredError(data?.error_description ?? 'Refresh token rejected.')
    }
    throw new Error(data?.error_description ?? data?.error ?? 'Could not refresh access token.')
  }
  // Google usually omits refresh_token on refresh (keep using the stored
  // one); Microsoft commonly rotates it, so callers must persist a new one
  // whenever present.
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

export async function fetchAccountEmail(
  provider: 'google' | 'microsoft',
  accessToken: string,
): Promise<string> {
  const url = provider === 'google' ? GOOGLE_USERINFO_URL : MICROSOFT_GRAPH_ME_URL
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Could not fetch ${provider} account email.`)
  const data = await res.json()
  const email = provider === 'google' ? data.email : (data.mail ?? data.userPrincipalName)
  if (!email) throw new Error(`${provider} did not return an email address.`)
  return email as string
}

export function buildAuthorizeUrl(
  provider: 'google' | 'microsoft',
  redirectUri: string,
  state: string,
): string {
  const { id } = clientCreds(provider)
  const base = provider === 'google' ? GOOGLE_AUTH_URL : MICROSOFT_AUTH_URL
  const scope = provider === 'google' ? GOOGLE_SCOPE : MICROSOFT_SCOPE
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
  })
  if (provider === 'google') {
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
  }
  return `${base}?${params.toString()}`
}
