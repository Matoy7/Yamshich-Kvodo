import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True once both build-time variables are present. The anon key is designed to
 * be public — access is governed by Row Level Security, not by hiding it.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The OAuth provider returns the session in the URL fragment; the client
    // picks it up and then cleans the address bar.
    detectSessionInUrl: true,
  },
})

/** Where the provider should send the user back to after consent. */
export function authRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}
