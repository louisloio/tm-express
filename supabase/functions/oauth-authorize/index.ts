// Starts the Gmail/Microsoft "connect mailbox" OAuth flow: mints a signed
// state token + a matching double-submit cookie, and returns the
// provider's authorize URL for the frontend to navigate to directly.
//
// Deploy: supabase functions deploy oauth-authorize
//
// Called with `credentials: 'include'` from the browser (not
// supabase.functions.invoke) so the Set-Cookie below is actually stored —
// that requires echoing the exact request Origin here rather than the
// wildcard '*' the other functions use, since browsers refuse credentialed
// responses with a wildcard ACAO.

import { resolveUser } from '../_shared/auth.ts'
import { buildAuthorizeUrl } from '../_shared/oauth_providers.ts'
import { randomNonce, signState } from '../_shared/oauth_state.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

function isAllowedOrigin(origin: string): boolean {
  return origin === 'http://localhost:5175' || /^https:\/\/tm-express[a-z0-9.-]*\.vercel\.app$/.test(origin)
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  const { userId } = await resolveUser(req)
  if (!userId) return json(req, { error: 'Not authenticated.' }, 401)

  let payload: { provider?: string; origin?: string; mailboxId?: string }
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: 'Invalid JSON body.' }, 400)
  }

  const { provider, origin, mailboxId } = payload
  if (provider !== 'google' && provider !== 'microsoft') {
    return json(req, { error: '"provider" must be "google" or "microsoft".' }, 400)
  }
  if (!origin || !isAllowedOrigin(origin)) {
    return json(req, { error: 'Unrecognized origin.' }, 400)
  }

  try {
    const nonce = randomNonce()
    const state = await signState({ userId, provider, origin, mailboxId, nonce })
    const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-${provider}-callback`
    const authorizeUrl = buildAuthorizeUrl(provider, redirectUri, state)

    return new Response(JSON.stringify({ url: authorizeUrl }), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/json',
        'Set-Cookie': `oauth_nonce=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
      },
    })
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : 'Could not start connection.' }, 500)
  }
})
