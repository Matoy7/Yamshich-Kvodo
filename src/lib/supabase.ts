import { createClient } from '@supabase/supabase-js'

/**
 * Reads a build-time variable, treating blank as absent.
 *
 * This matters in CI: `VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}`
 * resolves to an empty string when the repository variable is not set, and an
 * empty string is not `undefined` — so `??` would happily pass `''` through to
 * `createClient`, which throws "supabaseUrl is required." at module load,
 * before React can render anything.
 */
function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const url = readEnv(import.meta.env.VITE_SUPABASE_URL)

/**
 * The publishable/anon key. It is public by design and ships in the bundle —
 * access is governed by the Row Level Security policies in
 * supabase/schema.sql, not by hiding this value.
 *
 * `VITE_SUPABASE_ANON_KEY` is the documented name; Supabase's newer
 * `sb_publishable_…` keys go in the same variable. The service-role/secret key
 * must never appear in this project.
 */
const publishableKey =
  readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY) ??
  readEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

/** True once both build-time variables are present and non-blank. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/**
 * Placeholders keep `createClient` from throwing when the app is unconfigured,
 * so the UI can render an explanatory screen instead of a blank page. No
 * request is ever made with them — `isSupabaseConfigured` gates the app first.
 */
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  publishableKey ?? 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The provider returns the session in the URL fragment; the client picks
      // it up on load and then cleans the address bar.
      detectSessionInUrl: true,
    },
  },
)

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
