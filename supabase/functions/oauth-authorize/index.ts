// Starts the Gmail/Microsoft "connect mailbox" OAuth flow: mints a signed
// state token + a matching nonce, and returns the provider's authorize URL
// for the frontend to navigate to directly.
//
// Deploy: supabase functions deploy oauth-authorize
//
// The nonce is returned in the JSON body (not a cookie) for the frontend
// to store in sessionStorage — cookies set via a cross-site fetch (this
// function's origin vs the app's origin) get silently dropped by modern
// browsers' third-party cookie blocking, which sessionStorage isn't
// subject to since it's same-origin end to end. See
// src/lib/mailboxOAuth.ts and src/pages/OAuthCallbackPage.tsx for the
// other half of this.

import { resolveUser } from '../_shared/auth.ts'
import { buildAuthorizeUrl } from '../_shared/oauth_providers.ts'
import { randomNonce, signState } from '../_shared/oauth_state.ts'
import { corsHeaders, json } from '../_shared/http.ts'

function isAllowedOrigin(origin: string): boolean {
  return origin === 'http://localhost:5175' || /^https:\/\/tm-express[a-z0-9.-]*\.vercel\.app$/.test(origin)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { userId } = await resolveUser(req)
  if (!userId) return json({ error: 'Not authenticated.' }, 401)

  let payload: { provider?: string; origin?: string; mailboxId?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const { provider, origin, mailboxId } = payload
  if (provider !== 'google' && provider !== 'microsoft') {
    return json({ error: '"provider" must be "google" or "microsoft".' }, 400)
  }
  if (!origin || !isAllowedOrigin(origin)) {
    return json({ error: 'Unrecognized origin.' }, 400)
  }

  try {
    const nonce = randomNonce()
    const state = await signState({ userId, provider, origin, mailboxId, nonce })
    const redirectUri = `${origin}/oauth/${provider}/callback`
    const authorizeUrl = buildAuthorizeUrl(provider, redirectUri, state)

    return json({ url: authorizeUrl, nonce })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not start connection.' }, 500)
  }
})
