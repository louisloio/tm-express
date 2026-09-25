import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { takeStoredOAuthNonce } from '../lib/mailboxOAuth'
import { supabase } from '../lib/supabase'

/** Where Google/Microsoft redirect back to after the user approves (or
 * declines) mailbox access — see src/lib/mailboxOAuth.ts for why this is
 * our own frontend route rather than a Supabase Edge Function directly.
 * Exchanges the nonce it finds in sessionStorage + the code/state in the
 * URL for a connected mailbox via the oauth-complete function, then routes
 * on to /profile with a result. */
export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function run() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const providerError = searchParams.get('error')
      const nonce = takeStoredOAuthNonce()

      if (providerError || !code || !state) {
        navigate(
          `/profile?oauth_error=${encodeURIComponent(providerError ?? 'Connection cancelled.')}`,
          { replace: true },
        )
        return
      }
      if (!nonce) {
        navigate(
          `/profile?oauth_error=${encodeURIComponent('This connection could not be verified — try again.')}`,
          { replace: true },
        )
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/sign-in', { replace: true })
        return
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ provider, code, state, nonce }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.error) {
        navigate(
          `/profile?oauth_error=${encodeURIComponent(data?.error ?? 'Could not connect this mailbox.')}`,
          { replace: true },
        )
        return
      }

      navigate(`/profile?connected=${provider}`, { replace: true })
    }

    void run()
  }, [navigate, provider, searchParams])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-app">
      <p className="text-[15px] text-text-secondary">Connecting…</p>
    </div>
  )
}
