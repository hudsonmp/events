import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client for server-side operations.
 * This uses the standard `createClient` from `@supabase/supabase-js`
 * and is safe for use in Server Components, Route Handlers, and Server Actions.
 * It uses the service_role key for elevated privileges.
 */
export function createServerClient() {
  return createClient(process.env.SUPABASE_PROJECT_URL!, process.env.SUPABASE_SERVICE_ROLE!)
}
