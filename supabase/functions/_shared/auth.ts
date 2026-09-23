import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Resolves the calling user's id from the request's own Authorization
 * header — never trust a userId/mailbox owner supplied in the request body. */
export async function resolveUser(req: Request): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { userId: null }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return { userId: null }
  return { userId: data.user.id }
}

/** Bypasses RLS — only for privileged reads/writes already scoped by hand
 * to a userId resolved via resolveUser(). */
export function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}
