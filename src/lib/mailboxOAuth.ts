import { supabase } from './supabase'

/** Starts the Gmail/Microsoft "connect mailbox" flow: calls oauth-authorize
 * with credentials included (so its Set-Cookie double-submit nonce is
 * actually stored — this is why it's a raw fetch, not
 * supabase.functions.invoke), then navigates the browser to the returned
 * provider authorize URL. Pass mailboxId when reconnecting an existing
 * mailbox rather than adding a new one. */
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
      credentials: 'include',
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
  if (!res.ok || !data?.url) {
    return { error: data?.error ?? 'Could not start connection.' }
  }

  window.location.href = data.url
  return { error: null }
}
