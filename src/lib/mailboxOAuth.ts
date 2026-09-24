import { supabase } from './supabase'

const NONCE_KEY = 'tmex_oauth_nonce'

/** Starts the Gmail/Microsoft "connect mailbox" flow: calls oauth-authorize,
 * stores the returned nonce in sessionStorage (read back by
 * OAuthCallbackPage once Google/Microsoft redirects to our own frontend —
 * see that file for why sessionStorage rather than a cookie), then
 * navigates the browser to the provider's authorize URL. Pass mailboxId
 * when reconnecting an existing mailbox rather than adding a new one. */
export async function startMailboxOAuth(
  provider: 'google' | 'microsoft',
  mailboxId?: string,
): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'Not signed in.' }

  let res: Response
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ provider, origin: window.location.origin, mailboxId }),
    })
  } catch {
    return { error: 'Could not reach the server.' }
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url || !data?.nonce) {
    return { error: data?.error ?? 'Could not start connection.' }
  }

  sessionStorage.setItem(NONCE_KEY, data.nonce)
  window.location.href = data.url
  return { error: null }
}

export function takeStoredOAuthNonce(): string | null {
  const nonce = sessionStorage.getItem(NONCE_KEY)
  sessionStorage.removeItem(NONCE_KEY)
  return nonce
}
