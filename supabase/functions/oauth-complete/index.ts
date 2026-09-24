// Completes the Gmail/Microsoft "connect mailbox" flow. Called by the
// frontend's /oauth/:provider/callback route (src/pages/OAuthCallbackPage.tsx)
// once the user is back in a normal authenticated context after Google/
// Microsoft's redirect — not called directly by the provider itself, so
// this is a normal authenticated function like the others (no raw-cookie
// handling needed).
//
// Deploy: supabase functions deploy oauth-complete

import { resolveUser, serviceClient } from '../_shared/auth.ts'
import { exchangeCode, fetchAccountEmail } from '../_shared/oauth_providers.ts'
import { verifyState } from '../_shared/oauth_state.ts'
import { upsertMailbox } from '../_shared/mailboxes.ts'
import { corsHeaders, json } from '../_shared/http.ts'

interface Payload {
  provider?: 'google' | 'microsoft'
  code?: string
  state?: string
  nonce?: string
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

  const { provider, code, state: stateToken, nonce } = payload
  if (provider !== 'google' && provider !== 'microsoft') {
    return json({ error: '"provider" must be "google" or "microsoft".' }, 400)
  }
  if (!code || !stateToken || !nonce) {
    return json({ error: 'Missing code, state, or nonce.' }, 400)
  }

  let state
  try {
    state = await verifyState(stateToken)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid or expired state.' }, 400)
  }

  // The nonce round-trips through the initiating browser's sessionStorage
  // (see oauth-authorize) — this is what stops a validly-signed authorize
  // URL being forwarded to someone else and having their mailbox attached
  // to the wrong account: a forwarded link carries no sessionStorage.
  if (state.nonce !== nonce) {
    return json({ error: 'This connection could not be verified — try again.' }, 400)
  }
  if (state.userId !== userId) {
    return json({ error: 'This connection was started by a different account.' }, 403)
  }
  if (state.provider !== provider) {
    return json({ error: 'Provider mismatch.' }, 400)
  }

  try {
    const redirectUri = `${state.origin}/oauth/${provider}/callback`
    const { accessToken, refreshToken } = await exchangeCode(provider, code, redirectUri)
    if (!refreshToken) throw new Error('No refresh token returned.')

    const email = await fetchAccountEmail(provider, accessToken)

    const admin = serviceClient()
    const result = await upsertMailbox(admin, {
      userId,
      mailboxId: state.mailboxId,
      email,
      provider,
      secretPlain: refreshToken,
    })
    if ('error' in result) return json({ error: result.error }, result.status)

    return json({ success: true, id: result.id })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not connect this mailbox.' }, 502)
  }
})
