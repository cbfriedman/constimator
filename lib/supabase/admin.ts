import "server-only"

import { createClient } from "@supabase/supabase-js"

let instance: ReturnType<typeof createClient> | null = null

/**
 * The privileged Supabase client, authenticated with the service-role key
 * — bypasses RLS and can call Admin API methods (auth.admin.*) that no
 * anon-key/session client can. As narrow and reviewed an exception as
 * lib/db/system.ts (step 29): its only caller today is
 * app/team/actions.ts's inviteTeammateAction, which needs
 * auth.admin.inviteUserByEmail to actually create the invited user and
 * send the email — there's no anon-key equivalent for that. Treat any new
 * caller of this as a decision worth a second look, same as
 * lib/db/system.ts.
 */
export function getSupabaseAdmin() {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
    }
    instance = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return instance
}
