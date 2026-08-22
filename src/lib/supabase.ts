import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

/**
 * The publishable/anon key. It is public by design and ships in the bundle —
 * access is governed by the Row Level Security policies in
 * supabase/schema.sql, not by hiding this value.
 *
 * `VITE_SUPABASE_ANON_KEY` is the documented name. Supabase's newer
 * `sb_publishable_…` keys work under the same variable; the alternative name
 * is accepted only as a convenience.
 *
 * The service-role/secret key must never appear in this project.
 */
const publishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** True once both build-time variables are present. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = createClient(url ?? 'http://localhost', publishableKey ?? 'public-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The provider returns the session in the URL fragment; the client picks
    // it up on load and then cleans the address bar.
    detectSessionInUrl: true,
  },
})

/**
 * Where Google should send the user back to.
 *
 * Derived from the address actually being served rather than from
 * `import.meta.env.BASE_URL`: the production build uses a relative base
 * (`./`), which would resolve to the domain root and drop the
 * `/Yamshich-Kvodo/` path. Using the live pathname makes this correct on both
 * http://localhost:8443/ and https://matoy7.github.io/Yamshich-Kvodo/.
 */
export function authRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}
