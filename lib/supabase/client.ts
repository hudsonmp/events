import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export function createClient(): SupabaseClient {
  // These environment variables must be set in your Vercel project settings.
  // They require the NEXT_PUBLIC_ prefix to be accessible on the client-side.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLIC

  if (!supabaseUrl || !supabaseAnonKey) {
    // This error indicates that the required public Supabase environment variables are missing.
    // Please ensure NEXT_PUBLIC_SUPABASE_PROJECT_URL and NEXT_PUBLIC_SUPABASE_ANON_PUBLIC
    // are correctly set in your Vercel project's environment variables.
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PROJECT_URL or NEXT_PUBLIC_SUPABASE_ANON_PUBLIC environment variables. " +
        "These are required for the client-side Supabase client. " +
        "Please check your Vercel project settings.",
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
