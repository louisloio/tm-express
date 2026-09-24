// Shared handler for the Gmail/Microsoft OAuth callback — hit as a raw
// top-level browser navigation from the provider (no Supabase JWT, no
// CORS involved), so both oauth-google-callback and
// oauth-microsoft-callback just call this with their provider name.

import { serviceClient } from './auth.ts'
import { exchangeCode, fetchAccountEmail } from './oauth_providers.ts'
import { verifyState } from './oauth_state.ts'
import { upsertMailbox } from './mailboxes.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie') ?? ''
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}

function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Set-Cookie': 'oauth_nonce=; Max-Age=0; Path=/' },
  })
}

export async function handleOAuthCallback(
  req: Request,
  provider: 'google' | 'microsoft',
): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateToken = url.searchParams.get('state')
  const providerError = url.searchParams.get('error')

  if (!stateToken) {
    // No way to know which frontend to send the user back to.
    return new Response('Missing state.', { status: 400 })
  }

  let state
  try {
    state = await verifyState(stateToken)
  } catch {
    return new Response('This connection attempt is invalid or expired.', { status: 400 })
  }

  const cookieNonce = getCookie(req, 'oauth_nonce')
  if (!cookieNonce || cookieNonce !== state.nonce) {
    return redirect(`${state.origin}/profile?oauth_error=Connection+could+not+be+verified.`)
  }

  if (providerError || !code) {
    return redirect(`${state.origin}/profile?oauth_error=${encodeURIComponent(providerError ?? 'Connection cancelled.')}`)
  }

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-${provider}-callback`
    const { accessToken, refreshToken } = await exchangeCode(provider, code, redirectUri)
    if (!refreshToken) throw new Error('No refresh token returned.')

    const email = await fetchAccountEmail(provider, accessToken)

    const admin = serviceClient()
    const result = await upsertMailbox(admin, {
      userId: state.userId,
      mailboxId: state.mailboxId,
      email,
      provider,
      secretPlain: refreshToken,
    })
    if ('error' in result) throw new Error(result.error)

    return redirect(`${state.origin}/profile?connected=${provider}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not connect this mailbox.'
    return redirect(`${state.origin}/profile?oauth_error=${encodeURIComponent(message)}`)
  }
}
