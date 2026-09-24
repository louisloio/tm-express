// Microsoft redirects here after the user approves (or declines) mailbox
// access. Deploy: supabase functions deploy oauth-microsoft-callback --no-verify-jwt
// (--no-verify-jwt is required — this is a raw browser navigation from
// Microsoft with no Supabase JWT at all; see _shared/oauth_callback.ts for
// the actual state/nonce verification that replaces it.)

import { handleOAuthCallback } from '../_shared/oauth_callback.ts'

Deno.serve((req: Request) => handleOAuthCallback(req, 'microsoft'))
